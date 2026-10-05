import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import { QueryFailedError } from 'typeorm';
import { PG_UNIQUE_VIOLATION } from '../../common/constants/database.constants.js';
import {
  BLANK_MESSAGE,
  INVALID_TOKEN_MESSAGE,
  TAKEN_MESSAGE,
} from '../../common/constants/error-messages.constants.js';
import { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import type { AuthContext } from './interfaces/auth-context.interface.js';
import { TokenDenylistService } from './token-denylist.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let foundUser: Partial<User> | null;
  let takenUsers: Partial<User>[];
  let otherUsers: Partial<User>[];
  let usersService: Record<string, ReturnType<typeof vi.fn>>;
  const authContext = (): AuthContext => ({
    payload: { sub: 1, jti: 'token-id', iat: 1, exp: 2 },
    token: 'current-token',
    user: foundUser as User,
  });
  const tokenDenylist = { revoke: vi.fn() };
  let signAsync: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    foundUser = {
      id: 1,
      email: 'jake@jake.jake',
      username: 'jake',
      password: await bcrypt.hash('jakejake', 4),
      bio: null,
      image: null,
    };
    takenUsers = [];
    otherUsers = [];
    signAsync = vi.fn().mockResolvedValue('jwt-token');
    usersService = {
      findByEmailWithPassword: vi.fn(() => Promise.resolve(foundUser)),
      findByEmailOrUsername: vi.fn(() => Promise.resolve(takenUsers)),
      create: vi.fn((input: { email: string; username: string }) =>
        Promise.resolve({ id: 2, ...input, bio: null, image: null }),
      ),
      findOthersByEmailOrUsername: vi.fn(() => Promise.resolve(otherUsers)),
      update: vi.fn((_id: number, changes: Partial<User>) =>
        Promise.resolve({ ...foundUser, ...changes }),
      ),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: TokenDenylistService, useValue: tokenDenylist },
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => ({ jwtExpiresIn: 3600 }) },
        },
        {
          provide: JwtService,
          useValue: { signAsync },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    await service.onModuleInit();
  });

  describe('login', () => {
    it('returns the user with a token for valid credentials', async () => {
      const result = await service.login({
        email: 'jake@jake.jake',
        password: 'jakejake',
      });

      expect(result).toEqual({
        user: {
          email: 'jake@jake.jake',
          token: 'jwt-token',
          username: 'jake',
          bio: null,
          image: null,
        },
      });
    });

    it('rejects a wrong password', async () => {
      await expect(
        service.login({ email: 'jake@jake.jake', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an unknown email after still checking a password hash', async () => {
      foundUser = null;
      const compareSpy = vi.spyOn(bcrypt, 'compare');
      await expect(
        service.login({ email: 'nobody@jake.jake', password: 'jakejake' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(compareSpy).toHaveBeenCalledTimes(1);
      compareSpy.mockRestore();
    });
  });

  describe('signup', () => {
    const input = {
      username: 'Jacob',
      email: 'jacob@jake.jake',
      password: 'jakejake',
    };

    it('creates the user with a hashed password and returns a token', async () => {
      const result = await service.signup(input);

      const [created] = usersService.create.mock.calls[0] as [
        { passwordHash: string },
      ];
      expect(created.passwordHash).not.toBe(input.password);
      expect(await bcrypt.compare(input.password, created.passwordHash)).toBe(
        true,
      );
      expect(result).toEqual({
        user: {
          email: input.email,
          token: 'jwt-token',
          username: input.username,
          bio: null,
          image: null,
        },
      });
    });

    it('rejects when email and username are taken', async () => {
      takenUsers = [{ email: input.email, username: input.username }];

      await expect(service.signup(input)).rejects.toMatchObject({
        status: 409,
        response: {
          errors: { email: [TAKEN_MESSAGE], username: [TAKEN_MESSAGE] },
        },
      });
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('returns 409 when a concurrent signup wins the unique constraint', async () => {
      usersService.create.mockImplementationOnce(() => {
        takenUsers = [{ email: input.email, username: 'someone-else' }];
        return Promise.reject(
          new QueryFailedError('INSERT', [], { code: PG_UNIQUE_VIOLATION }),
        );
      });

      await expect(service.signup(input)).rejects.toMatchObject({
        status: 409,
        response: { errors: { email: [TAKEN_MESSAGE] } },
      });
    });
  });

  describe('logout', () => {
    it('revokes the token id until it expires', async () => {
      await service.logout(authContext().payload);

      expect(tokenDenylist.revoke).toHaveBeenCalledWith('token-id', 2);
    });
  });

  describe('getCurrentUser', () => {
    it('returns the user with the presented token', () => {
      const result = service.getCurrentUser(authContext());

      expect(result.user).toMatchObject({
        email: 'jake@jake.jake',
        username: 'jake',
        token: 'current-token',
      });
      expect(signAsync).not.toHaveBeenCalled();
    });
  });

  describe('updateCurrentUser', () => {
    it('keeps the presented token when the password is unchanged', async () => {
      const result = await service.updateCurrentUser(authContext(), {
        bio: 'Hello',
      });

      expect(usersService.update).toHaveBeenCalledWith(1, { bio: 'Hello' });
      expect(result.user).toMatchObject({
        bio: 'Hello',
        token: 'current-token',
      });
      expect(signAsync).not.toHaveBeenCalled();
    });

    it('hashes a new password and keeps the presented token', async () => {
      const result = await service.updateCurrentUser(authContext(), {
        password: 'newpass12',
      });

      const [, changes] = usersService.update.mock.calls[0] as [
        number,
        { passwordHash: string; passwordChangedJti: string },
      ];
      expect(Object.keys(changes).sort()).toEqual([
        'passwordChangedJti',
        'passwordHash',
      ]);
      expect(changes.passwordChangedJti).toBe('token-id');
      expect(await bcrypt.compare('newpass12', changes.passwordHash)).toBe(
        true,
      );
      expect(result.user.token).toBe('current-token');
      expect(signAsync).not.toHaveBeenCalled();
    });

    it('accepts null to clear bio and image', async () => {
      const result = await service.updateCurrentUser(authContext(), {
        bio: null,
        image: null,
      });
      expect(result.user).toMatchObject({ bio: null, image: null });
    });

    it("rejects an update without any field as can't be blank", async () => {
      await expect(
        service.updateCurrentUser(authContext(), {}),
      ).rejects.toMatchObject({
        status: 422,
        response: { errors: { user: [BLANK_MESSAGE] } },
      });
    });

    it('rejects an email or username used by another user', async () => {
      otherUsers = [{ email: 'taken@jake.jake', username: 'taken' }];

      await expect(
        service.updateCurrentUser(authContext(), {
          email: 'taken@jake.jake',
          username: 'taken',
        }),
      ).rejects.toMatchObject({
        status: 409,
        response: {
          errors: { email: [TAKEN_MESSAGE], username: [TAKEN_MESSAGE] },
        },
      });
      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('returns 409 when a concurrent update wins the unique constraint', async () => {
      usersService.update.mockImplementationOnce(() => {
        otherUsers = [{ email: 'race@jake.jake', username: 'other' }];
        return Promise.reject(
          new QueryFailedError('UPDATE', [], { code: PG_UNIQUE_VIOLATION }),
        );
      });

      await expect(
        service.updateCurrentUser(authContext(), { email: 'race@jake.jake' }),
      ).rejects.toMatchObject({
        status: 409,
        response: { errors: { email: [TAKEN_MESSAGE] } },
      });
    });

    it('rejects the token when the user disappears during the update', async () => {
      usersService.update.mockResolvedValueOnce(null);

      await expect(
        service.updateCurrentUser(authContext(), { bio: 'Hello' }),
      ).rejects.toMatchObject({
        status: 401,
        response: { errors: { token: [INVALID_TOKEN_MESSAGE] } },
      });
    });
  });
});
