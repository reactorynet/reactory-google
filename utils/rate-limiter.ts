/**
 * Google API rate limiter using the core RedisService
 */

const DEFAULT_WINDOW_SECONDS = 60;
const DEFAULT_LIMIT = 100;

export class GoogleRateLimiter {
  constructor(private redisService: any) {}

  private getCacheKey(userId: string, service: string): string {
    return `google:ratelimit:${userId}:${service}`;
  }

  /**
   * Increment the request counter for a user+service and check against the limit.
   */
  async checkAndIncrement(
    userId: string,
    service: string,
    limit: number = DEFAULT_LIMIT,
    windowSeconds: number = DEFAULT_WINDOW_SECONDS
  ): Promise<{ allowed: boolean; remaining: number }> {
    const key = this.getCacheKey(userId, service);
    let current = 0;

    try {
      const cached = await this.redisService.get(key);
      current = cached ? parseInt(cached, 10) : 0;

      if (current >= limit) {
        return { allowed: false, remaining: 0 };
      }

      const newCount = current + 1;
      await this.redisService.set(key, String(newCount), windowSeconds);

      return { allowed: true, remaining: limit - newCount };
    } catch {
      // If Redis is unavailable, allow the request
      return { allowed: true, remaining: limit - current - 1 };
    }
  }

  /**
   * Get the current usage count for a user+service.
   */
  async getUsage(userId: string, service: string): Promise<number> {
    const key = this.getCacheKey(userId, service);
    try {
      const cached = await this.redisService.get(key);
      return cached ? parseInt(cached, 10) : 0;
    } catch {
      return 0;
    }
  }
}
