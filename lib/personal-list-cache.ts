type CacheEntry<T> = {
  data: T;
  updatedAt: number;
};

const memory = new Map<string, CacheEntry<unknown>>();
const listeners = new Map<string, Set<() => void>>();

const storageKey = (key: string) => `vt:plist:${key}`;

const notify = (key: string) => {
  const set = listeners.get(key);
  if (!set) return;
  for (const listener of set) listener();
};

const readStorage = <T,>(key: string): CacheEntry<T> | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || typeof parsed.updatedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeStorage = <T,>(key: string, entry: CacheEntry<T>) => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(key), JSON.stringify(entry));
  } catch {
    // Quota / private mode — memory cache still works.
  }
};

export const getPersonalListCache = <T,>(key: string): CacheEntry<T> | null => {
  const fromMemory = memory.get(key) as CacheEntry<T> | undefined;
  if (fromMemory) return fromMemory;

  const fromStorage = readStorage<T>(key);
  if (fromStorage) {
    memory.set(key, fromStorage);
    return fromStorage;
  }

  return null;
};

export const setPersonalListCache = <T,>(key: string, data: T): void => {
  const entry: CacheEntry<T> = { data, updatedAt: Date.now() };
  memory.set(key, entry);
  writeStorage(key, entry);
  notify(key);
};

export const invalidatePersonalListCache = (prefix: string): void => {
  const keys = new Set<string>();

  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) keys.add(key);
  }

  if (typeof window !== "undefined") {
    try {
      for (let i = 0; i < sessionStorage.length; i += 1) {
        const fullKey = sessionStorage.key(i);
        if (!fullKey?.startsWith("vt:plist:")) continue;
        const key = fullKey.slice("vt:plist:".length);
        if (key.startsWith(prefix)) keys.add(key);
      }
    } catch {
      // ignore
    }
  }

  for (const key of keys) {
    memory.delete(key);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(storageKey(key));
      } catch {
        // ignore
      }
    }
    notify(key);
  }
};

export const subscribePersonalListCache = (
  key: string,
  listener: () => void,
): (() => void) => {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set && set.size === 0) listeners.delete(key);
  };
};

export const historyListCacheKey = (userId: string, page: number) =>
  `history:v1:${userId}:${page}`;

export const bookmarksListCacheKey = (userId: string, page: number) =>
  `bookmarks:v1:${userId}:${page}`;

export const HISTORY_CACHE_PREFIX = "history:v1:";
export const BOOKMARKS_CACHE_PREFIX = "bookmarks:v1:";

const LAST_USER_STORAGE_KEY = "vt:plist:last-user";

export const rememberPersonalListUserId = (userId: string): void => {
  if (typeof window === "undefined" || !userId) return;
  try {
    sessionStorage.setItem(LAST_USER_STORAGE_KEY, userId);
  } catch {
    // ignore
  }
};

export const getLastPersonalListUserId = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(LAST_USER_STORAGE_KEY);
  } catch {
    return null;
  }
};
