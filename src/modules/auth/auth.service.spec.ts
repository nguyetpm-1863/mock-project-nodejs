import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let foundUser: Partial<User> | null;

  beforeEach(async () => {
    foundUser = {
      id: 1,
      email: 'jake@jake.jake',
      username: 'jake',
      password: await bcrypt.hash('jakejake', 4),
      bio: null,
      image: null,
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmailWithPassword: vi.fn(() => Promise.resolve(foundUser)),
          },
        },
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
