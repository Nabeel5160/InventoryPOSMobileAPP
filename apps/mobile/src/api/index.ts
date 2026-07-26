import { createMockApi } from './mockApi';
import { createNestApi } from './nestApi';
import type { ApiClient } from './types';

export type ApiMode = 'mock' | 'live';

export function getApiMode(): ApiMode {
  const mode = process.env.EXPO_PUBLIC_API_MODE;
  return mode === 'live' ? 'live' : 'mock';
}

let client: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!client) {
    client = getApiMode() === 'live' ? createNestApi() : createMockApi();
  }
  return client;
}

export function resetApiClient() {
  client = null;
}
