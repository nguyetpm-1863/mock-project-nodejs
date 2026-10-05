import { Test } from '@nestjs/testing';
import { REDIS_CLIENT } from '../../redis/redis.constants.js';
import {
  MILLISECONDS_PER_SECOND,
  TOKEN_DENYLIST_KEY_PREFIX,
} from './constants/auth.constants.js';
import { TokenDenylistService } from './token-denylist.service.js';

describe('TokenDenylistService', () => {
  let service: TokenDenylistService;
  const redis = { set: vi.fn(), exists: vi.fn() };
  const nowSeconds = () => Math.floor(Date.now() / MILLISECONDS_PER_SECOND);

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        TokenDenylistService,
        { provide: REDIS_CLIENT, useValue: redis },
      ],
    }).compile();
    service = moduleRef.get(TokenDenylistService);
  });

  it('stores the jti until the token would expire', async () => {
    await service.revoke('abc', nowSeconds() + 60);

    const [key, , mode, ttl] = redis.set.mock.calls[0] as [
      string,
      string,
      string,
      number,
    ];
    expect(key).toBe(`${TOKEN_DENYLIST_KEY_PREFIX}abc`);
    expect(mode).toBe('EX');
    expect(ttl).toBeGreaterThan(55);
    expect(ttl).toBeLessThanOrEqual(60);
  });

  it('skips tokens that have already expired', async () => {
    await service.revoke('abc', nowSeconds() - 1);
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('reports whether a jti is revoked', async () => {
    redis.exists.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    expect(await service.isRevoked('abc')).toBe(true);
    expect(await service.isRevoked('def')).toBe(false);
  });
});
