export type StoredMobileSession = {
  token: string;
  user: Record<string, unknown> | null;
  roles: string[];
};
export const SESSION_STORAGE_KEY: string;
export function sanitizeUser(user: unknown): Record<string, unknown> | null;
export function serializeSession(session: StoredMobileSession): string;
export function parseSession(value: string | null | undefined): StoredMobileSession | null;
export function createSessionStorage(storage: {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}): {
  read(): Promise<StoredMobileSession | null>;
  write(session: StoredMobileSession): Promise<void>;
  clear(): Promise<void>;
};
