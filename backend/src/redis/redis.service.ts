import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import Redis from 'ioredis';

class MemoryRedis {
  private store = new Map<string, { value: string; expiresAt?: number }>();
  private sets = new Map<string, Set<string>>();

  async sadd(key: string, member: string) {
    if (!this.sets.has(key)) this.sets.set(key, new Set());
    this.sets.get(key)!.add(member);
  }

  async srem(key: string, member: string) {
    this.sets.get(key)?.delete(member);
  }

  async scard(key: string) {
    return this.sets.get(key)?.size ?? 0;
  }

  async set(key: string, value: string, _mode?: string, ttl?: number) {
    this.store.set(key, {
      value,
      expiresAt: ttl ? Date.now() + ttl * 1000 : undefined,
    });
  }

  async get(key: string) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async del(key: string) {
    this.store.delete(key);
    this.sets.delete(key);
  }

  subscribe(_channel: string) {
    return Promise.resolve();
  }

  on(_event: string, _handler: (...args: unknown[]) => void) {
    return this;
  }

  disconnect() {
    this.store.clear();
    this.sets.clear();
  }
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | MemoryRedis;
  private pub: Redis | MemoryRedis;
  private sub: Redis | MemoryRedis | EventEmitter;
  private embedded = false;

  constructor(private config: ConfigService) {
    const useEmbedded = config.get('USE_EMBEDDED_REDIS') === 'true';

    if (useEmbedded) {
      this.embedded = true;
      this.client = new MemoryRedis();
      this.pub = new MemoryRedis();
      this.sub = new EventEmitter();
      this.logger.warn('Using in-memory Redis — dev mode only');
      return;
    }

    const url = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.client = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
    this.pub = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
    this.sub = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
  }

  getClient() {
    return this.client;
  }

  getPub() {
    return this.pub;
  }

  getSub() {
    return this.sub;
  }

  async setOnline(userId: string, socketId: string) {
    await this.client.sadd(`online:${userId}`, socketId);
    await this.client.set(`presence:${userId}`, 'online', 'EX', 300);
  }

  async setOffline(userId: string, socketId: string) {
    await this.client.srem(`online:${userId}`, socketId);
    const count = await this.client.scard(`online:${userId}`);
    if (count === 0) {
      await this.client.set(`presence:${userId}`, 'offline', 'EX', 86400);
      await this.client.del(`online:${userId}`);
    }
  }

  async isOnline(userId: string): Promise<boolean> {
    const count = await this.client.scard(`online:${userId}`);
    return count > 0;
  }

  async getOnlineUsers(userIds: string[]): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {};
    await Promise.all(
      userIds.map(async (id) => {
        result[id] = await this.isOnline(id);
      }),
    );
    return result;
  }

  async cacheGet<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async cacheSet(key: string, value: unknown, ttlSeconds = 300) {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async cacheDel(key: string) {
    await this.client.del(key);
  }

  onModuleDestroy() {
    if (this.embedded) {
      (this.client as MemoryRedis).disconnect();
      (this.pub as MemoryRedis).disconnect();
      return;
    }
    (this.client as Redis).disconnect();
    (this.pub as Redis).disconnect();
    (this.sub as Redis).disconnect();
  }
}
