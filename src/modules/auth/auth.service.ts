import {
  ConflictException,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'node:crypto';
import {
  INVALID_MESSAGE,
  TAKEN_MESSAGE,
} from '../../common/constants/error-messages.constants.js';
import { isUniqueViolation } from '../../common/database/is-unique-violation.js';
import { type ApiErrors, apiErrors } from '../../common/errors/api-errors.js';
import type { AuthConfig } from '../../config/auth.config.js';
import { User } from '../users/entities/user.entity.js';
import { UserCreationFailedError } from '../users/errors/user-creation-failed.error.js';
import { UsersService } from '../users/users.service.js';
import {
  CREDENTIALS_ERROR_FIELD,
  FALLBACK_SECRET_BYTES,
  PASSWORD_HASH_ROUNDS,
} from './constants/auth.constants.js';
import { AuthUserResponseDto } from './dto/auth-user-response.dto.js';
import { LoginUserDto } from './dto/login.dto.js';
import { SignupUserDto } from './dto/signup.dto.js';
import type { JwtPayload } from './interfaces/jwt-payload.interface.js';
import { TokenDenylistService } from './token-denylist.service.js';

@Injectable()
export class AuthService implements OnModuleInit {
  private unknownUserHash: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tokenDenylist: TokenDenylistService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.unknownUserHash = await bcrypt.hash(
      randomBytes(FALLBACK_SECRET_BYTES).toString('hex'),
      PASSWORD_HASH_ROUNDS,
    );
  }

  async signup({
    username,
    email,
    password,
  }: SignupUserDto): Promise<AuthUserResponseDto> {
    const [, passwordHash] = await Promise.all([
      this.assertAvailable(email, username),
      bcrypt.hash(password, PASSWORD_HASH_ROUNDS),
    ]);

    const user = await this.usersService
      .create({ email, username, passwordHash })
      .catch((error: unknown) =>
        this.handleCreateError(error, email, username),
      );
    return this.buildAuthResponse(user);
  }

  async login({ email, password }: LoginUserDto): Promise<AuthUserResponseDto> {
    const user = await this.usersService.findByEmailWithPassword(email);
    const isPasswordValid = await bcrypt.compare(
      password,
      user?.password ?? this.unknownUserHash,
    );

    if (!user || !isPasswordValid) {
      throw new UnauthorizedException(
        apiErrors({ [CREDENTIALS_ERROR_FIELD]: [INVALID_MESSAGE] }),
      );
    }

    return this.buildAuthResponse(user);
  }

  async logout({ jti, exp }: JwtPayload): Promise<void> {
    await this.tokenDenylist.revoke(jti, exp);
  }

  private async handleCreateError(
    error: unknown,
    email: string,
    username: string,
  ): Promise<never> {
    if (isUniqueViolation(error)) {
      await this.assertAvailable(email, username);
    }
    throw new UserCreationFailedError(error);
  }

  private async assertAvailable(
    email: string,
    username: string,
  ): Promise<void> {
    const existing = await this.usersService.findByEmailOrUsername(
      email,
      username,
    );
    const errors: ApiErrors = {};
    if (existing.some((user) => user.email === email)) {
      errors.email = [TAKEN_MESSAGE];
    }
    if (existing.some((user) => user.username === username)) {
      errors.username = [TAKEN_MESSAGE];
    }
    if (Object.keys(errors).length > 0) {
      throw new ConflictException(apiErrors(errors));
    }
  }

  private async buildAuthResponse(user: User): Promise<AuthUserResponseDto> {
    const { jwtExpiresIn } = this.configService.getOrThrow<AuthConfig>('auth');
    const token = await this.jwtService.signAsync(
      { sub: user.id, username: user.username },
      { expiresIn: jwtExpiresIn, jwtid: randomUUID() },
    );
    return {
      user: {
        email: user.email,
        token,
        username: user.username,
        bio: user.bio,
        image: user.image,
      },
    };
  }
}
