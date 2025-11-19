let logoutHandler: (() => void) | null = null;

export function registerLogoutHandler(fn: () => void) {
  logoutHandler = fn;
}

export function emitLogout() {
  if (logoutHandler) logoutHandler();
}
