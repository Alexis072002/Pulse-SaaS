import { Injectable } from "@nestjs/common";

@Injectable()
export class CacheService {
  private readonly store = new Map<string, { value: unknown; expiresAt: number }>();

  async get<T>(key: string): Promise<T | null> {
    const cached = this.store.get(key);
    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return cached.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }

  async del(pattern: string): Promise<void> {
    for (const key of this.store.keys()) {
      if (this.matchesPattern(key, pattern)) {
        this.store.delete(key);
      }
    }
  }

  async wrap<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const freshValue = await fn();
    await this.set(key, freshValue, ttlSeconds);
    return freshValue;
  }

  private matchesPattern(key: string, pattern: string): boolean {
    const regex = new RegExp(`^${pattern.replace(/\*/g, ".*")}$`);
    return regex.test(key);
  }
}
