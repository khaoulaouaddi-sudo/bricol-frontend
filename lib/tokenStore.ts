let accessToken: string | null = null;
const listeners = new Set<(t: string | null) => void>();

export function setAccessToken(t: string | null) {
  accessToken = t;
  for (const l of listeners) l(accessToken);
}
export function getAccessToken() {
  return accessToken;
}
export function onAccessTokenChange(cb: (t: string | null) => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
