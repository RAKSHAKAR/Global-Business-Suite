export interface CaptchaSession {
  text: string;
  expiresAt: number;
  attempts: number;
}

// In-memory store for captchas.
// For a multi-node production deployment, this should be backed by Redis or a DB.
const store = new Map<string, CaptchaSession>();

// Cleanup expired sessions every 1 minute
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of store.entries()) {
    if (session.expiresAt < now) {
      store.delete(key);
    }
  }
}, 60000);

export const captchaStore = {
  set(id: string, session: CaptchaSession) {
    store.set(id, session);
  },
  get(id: string) {
    return store.get(id);
  },
  delete(id: string) {
    store.delete(id);
  },
  incrementAttempt(id: string) {
    const session = store.get(id);
    if (session) {
      session.attempts += 1;
    }
  },
};
