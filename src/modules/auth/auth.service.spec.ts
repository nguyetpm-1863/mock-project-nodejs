import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import { QueryFailedError } from 'typeorm';
import { PG_UNIQUE_VIOLATION } from '../../common/constants/database.constants.js';
import { TAKEN_MESSAGE } from '../../common/constants/error-messages.constants.js';
import { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import { TokenDenylistService } from './token-denylist.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let foundUser: Partial<User> | null;
  let takenUsers: Partial<User>[];
  let usersService: {
    findByEmailWithPassword: ReturnType<typeof vi.fn>;
    findByEmailOrUsername: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  const tokenDenylist = { revoke: vi.fn() };

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
    usersService = {
      findByEmailWithPassword: vi.fn(() => Promise.resolve(foundUser)),
      findByEmailOrUsername: vi.fn(() => Promise.resolve(takenUsers)),
      create: vi.fn((input: { email: string; username: string }) =>
        Promise.resolve({ id: 2, ...input, bio: null, image: null }),
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
          useValue: { signAsync: vi.fn().mockResolvedValue('jwt-token') },
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
      await service.logout({
        sub: 1,
        username: 'jake',
        jti: 'token-id',
        iat: 1,
        exp: 2,
      });

      expect(tokenDenylist.revoke).toHaveBeenCalledWith('token-id', 2);
    });
  });
});
