import NetInfo from '@react-native-community/netinfo';
import type { SyncConflict } from '@iq/shared';
import { getApiClient } from '../api';
import { listOutbox, removeOutbox } from '../db/offline';

export type SyncStatus = {
  syncing: boolean;
  lastSyncedAt: string | null;
  lastConflicts: SyncConflict[];
  pendingCount: number;
};

let listeners: Array<(s: SyncStatus) => void> = [];
let status: SyncStatus = {
  syncing: false,
  lastSyncedAt: null,
  lastConflicts: [],
  pendingCount: 0,
};

function emit() {
  listeners.forEach((l) => l(status));
}

export function subscribeSyncStatus(listener: (s: SyncStatus) => void) {
  listeners.push(listener);
  listener(status);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export async function refreshPendingCount() {
  const pending = await listOutbox();
  status = { ...status, pendingCount: pending.length };
  emit();
}

/** LWW: server wins when conflict returned with newer serverUpdatedAt */
export function pickLwwWinner<T extends { updatedAt: string }>(
  local: T,
  server: T,
): { winner: T; source: 'local' | 'server' } {
  const localTs = Date.parse(local.updatedAt);
  const serverTs = Date.parse(server.updatedAt);
  if (localTs > serverTs) return { winner: local, source: 'local' };
  return { winner: server, source: 'server' };
}

export async function flushOutbox(token: string | null) {
  if (!token || status.syncing) return status;
  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    await refreshPendingCount();
    return status;
  }

  status = { ...status, syncing: true };
  emit();

  try {
    const mutations = await listOutbox();
    if (!mutations.length) {
      status = {
        ...status,
        syncing: false,
        pendingCount: 0,
        lastSyncedAt: new Date().toISOString(),
      };
      emit();
      return status;
    }

    const result = await getApiClient().sync(token, { mutations });
    await removeOutbox(result.applied);
    const remaining = await listOutbox();
    status = {
      syncing: false,
      lastSyncedAt: result.serverTime,
      lastConflicts: result.conflicts,
      pendingCount: remaining.length,
    };
    emit();
    return status;
  } catch {
    status = { ...status, syncing: false };
    emit();
    await refreshPendingCount();
    return status;
  }
}

export function startSyncWatcher(getToken: () => string | null) {
  const unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      void flushOutbox(getToken());
    }
  });
  void refreshPendingCount();
  void flushOutbox(getToken());
  return unsubscribe;
}
