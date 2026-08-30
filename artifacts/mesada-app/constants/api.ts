import {
  setBaseUrl,
  setAuthTokenGetter,
  type AuthTokenGetter,
} from '@workspace/api-client-react';

function resolveApiOrigin(): string {
  const raw = process.env.EXPO_PUBLIC_DOMAIN;
  if (raw && raw.length > 0) {
    const clean = raw.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `https://${clean}`;
  }
  // Local fallback (web dev without EXPO_PUBLIC_DOMAIN)
  return 'http://localhost:8080';
}

// Domain root. The api-server is reached at the root (port 8080 -> external 80)
// and its routes are already prefixed with /api (e.g. /api/families), which the
// generated client paths include — so setBaseUrl gets the ORIGIN, not /api.
export const API_ORIGIN = resolveApiOrigin();

// Full /api base for raw fetches that are NOT part of the generated client
// (object storage upload + serving URLs).
export const API_BASE = `${API_ORIGIN}/api`;

let configured = false;
let currentTokenGetter: AuthTokenGetter = () => null;

export function configureApiClient(tokenGetter: AuthTokenGetter): void {
  setBaseUrl(API_ORIGIN);
  setAuthTokenGetter(tokenGetter);
  currentTokenGetter = tokenGetter;
  configured = true;
}

export function getAuthToken(): ReturnType<AuthTokenGetter> {
  return currentTokenGetter();
}

export function isApiConfigured(): boolean {
  return configured;
}
