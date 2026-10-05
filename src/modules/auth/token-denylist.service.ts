import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.constants.js';
import {
  MILLISECONDS_PER_SECOND,
  TOKEN_DENYLIST_KEY_PREFIX,
  TOKEN_DENYLIST_VALUE,
} from './constants/auth.constants.js';

@Injectable()
export class TokenDenylistService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async revoke(jti: string, expiresAt: number): Promise<void> {
    const ttlSeconds =
      expiresAt - Math.floor(Date.now() / MILLISECONDS_PER_SECOND);
    if (ttlSeconds > 0) {
      await this.redis.set(
        this.key(jti),
        TOKEN_DENYLIST_VALUE,
        'EX',
        ttlSeconds,
      );
    }
  }

  async isRevoked(jti: string): Promise<boolean> {
    return (await this.redis.exists(this.key(jti))) === 1;
  }

  private key(jti: string): string {
    return `${TOKEN_DENYLIST_KEY_PREFIX}${jti}`;
  }
}
