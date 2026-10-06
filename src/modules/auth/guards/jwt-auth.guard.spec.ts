import type { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import {
  INVALID_TOKEN_MESSAGE,
  MISSING_MESSAGE,
} from '../../../common/constants/error-messages.constants.js';
import { UsersService } from '../../users/users.service.js';
import { MILLISECONDS_PER_SECOND } from '../constants/auth.constants.js';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface.js';
import { TokenDenylistService } from '../token-denylist.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  const issuedAt = 1_800_000_000;
  const payload = {
    sub: 1,
    jti: 'token-id',
    iat: issuedAt,
    exp: issuedAt + 60,
  };
  const user = {
    id: 1,
    passwordChangedAt: null as Date | null,
    passwordChangedJti: null as string | null,
  };
  const jwtService = { verifyAsync: vi.fn() };
  const tokenDenylist = { isRevoked: vi.fn() };
  const usersService = { findById: vi.fn() };

  const contextFor = (authorization?: string) => {
    const request = { headers: { authorization } } as AuthenticatedRequest;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { request, context };
  };

  const tokenErrorBody = (message: string) => ({
    status: 401,
    response: { errors: { token: [message] } },
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    user.passwordChangedAt = null;
    user.passwordChangedJti = null;
    jwtService.verifyAsync.mockResolvedValue(payload);
    tokenDenylist.isRevoked.mockResolvedValue(false);
    usersService.findById.mockResolvedValue(user);

    const moduleRef = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: JwtService, useValue: jwtService },
        { provide: TokenDenylistService, useValue: tokenDenylist },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();
    guard = moduleRef.get(JwtAuthGuard);
  });

  it('attaches payload, token and user for a valid token', async () => {
    const { request, context } = contextFor('Token abc');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.auth).toEqual({ payload, token: 'abc', user });
  });

  it.each([undefined, 'Bearer abc', 'Token'])(
    'rejects header %s as missing',
    async (header) => {
      await expect(
        guard.canActivate(contextFor(header).context),
      ).rejects.toMatchObject(tokenErrorBody(MISSING_MESSAGE));
    },
  );

  it('rejects a token that fails verification', async () => {
    jwtService.verifyAsync.mockRejectedValueOnce(new Error('bad'));
    await expect(
      guard.canActivate(contextFor('Token abc').context),
    ).rejects.toMatchObject(tokenErrorBody(INVALID_TOKEN_MESSAGE));
  });

  it('rejects a revoked token', async () => {
    tokenDenylist.isRevoked.mockResolvedValueOnce(true);
    await expect(
      guard.canActivate(contextFor('Token abc').context),
    ).rejects.toMatchObject(tokenErrorBody(INVALID_TOKEN_MESSAGE));
  });

  it('rejects a token whose user no longer exists', async () => {
    usersService.findById.mockResolvedValueOnce(null);
    await expect(
      guard.canActivate(contextFor('Token abc').context),
    ).rejects.toMatchObject(tokenErrorBody(INVALID_TOKEN_MESSAGE));
  });

  it('rejects a token issued before the last password change', async () => {
    user.passwordChangedAt = new Date((issuedAt + 1) * MILLISECONDS_PER_SECOND);
    await expect(
      guard.canActivate(contextFor('Token abc').context),
    ).rejects.toMatchObject(tokenErrorBody(INVALID_TOKEN_MESSAGE));
  });

  it('accepts a token issued in the same second as the password change', async () => {
    user.passwordChangedAt = new Date(issuedAt * MILLISECONDS_PER_SECOND + 500);
    await expect(
      guard.canActivate(contextFor('Token abc').context),
    ).resolves.toBe(true);
  });

  it('accepts the token that performed the password change', async () => {
    user.passwordChangedAt = new Date(
      (issuedAt + 10) * MILLISECONDS_PER_SECOND,
    );
    user.passwordChangedJti = payload.jti;
    await expect(
      guard.canActivate(contextFor('Token abc').context),
    ).resolves.toBe(true);
  });
});
