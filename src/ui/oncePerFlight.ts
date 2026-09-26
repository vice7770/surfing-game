/**
 * Wrap an async action so a call made while one is still running is ignored
 * (resolving at once): a second Enter on "Paddle out" during the loading card
 * does not start a second session. Once the running call settles, it runs again.
 */
export function oncePerFlight(action: () => Promise<void>): () => Promise<void> {
  let running = false;
  return async () => {
    if (running) return;
    running = true;
    try {
      await action();
    } finally {
      running = false;
    }
  };
}
