import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Body, Button, Card, Muted, Screen, Subtitle, Title } from '@/src/ui/primitives';
import { useAuthStore } from '@/src/store/authStore';
import { getApiMode } from '@/src/api';
import {
  flushOutbox,
  subscribeSyncStatus,
  type SyncStatus,
} from '@/src/sync/syncEngine';
import { isFirebaseConfigured, registerForPushStub } from '@/src/firebase';
import { spacing } from '@/src/theme';

export default function MoreScreen() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const [sync, setSync] = useState<SyncStatus | null>(null);
  const [push, setPush] = useState<{ enabled: boolean } | null>(null);

  useEffect(() => subscribeSyncStatus(setSync), []);
  useEffect(() => {
    void registerForPushStub().then(setPush);
  }, []);

  return (
    <Screen>
      <Title accessibilityRole="header">Account</Title>
      <Card>
        <Subtitle>{user?.name}</Subtitle>
        <Muted>{user?.email}</Muted>
        <Body style={{ marginTop: spacing.sm }}>Role: {user?.role}</Body>
      </Card>

      <Card>
        <Subtitle>Connectivity</Subtitle>
        <Muted>API mode: {getApiMode()}</Muted>
        <Muted>Firebase: {isFirebaseConfigured() ? 'configured' : 'stub / off'}</Muted>
        <Muted>FCM stub: {push?.enabled ? 'ready' : 'disabled'}</Muted>
        <Muted>Pending mutations: {sync?.pendingCount ?? 0}</Muted>
        <Muted>
          Last sync: {sync?.lastSyncedAt ?? 'never'}
          {sync?.syncing ? ' (in progress)' : ''}
        </Muted>
        {sync?.lastConflicts?.length ? (
          <Muted>
            Conflicts: {sync.lastConflicts.map((c) => c.message).join('; ')}
          </Muted>
        ) : null}
        <View style={{ marginTop: spacing.md }}>
          <Button
            label="Sync now"
            variant="secondary"
            onPress={() => void flushOutbox(token)}
          />
        </View>
      </Card>

      <Button label="Sign out" variant="danger" onPress={() => void logout()} />
    </Screen>
  );
}
