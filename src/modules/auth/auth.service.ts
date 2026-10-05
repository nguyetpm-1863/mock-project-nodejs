import {
  ConflictException,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'node:crypto';
import {
  BLANK_MESSAGE,
  INVALID_MESSAGE,
  INVALID_TOKEN_MESSAGE,
  TAKEN_MESSAGE,
} from '../../common/constants/error-messages.constants.js';
import { isUniqueViolation } from '../../common/database/is-unique-violation.js';
import { type ApiErrors, apiErrors } from '../../common/errors/api-errors.js';
import type { AuthConfig } from '../../config/auth.config.js';
import type { UpdateUserFieldsDto } from '../users/dto/update-user.dto.js';
import { User } from '../users/entities/user.entity.js';
import { UserCreationFailedError } from '../users/errors/user-creation-failed.error.js';
import { UserUpdateFailedError } from '../users/errors/user-update-failed.error.js';
import type { UpdateUserInput } from '../users/interfaces/update-user-input.interface.js';
import { UsersService } from '../users/users.service.js';
import {
  CREDENTIALS_ERROR_FIELD,
  FALLBACK_SECRET_BYTES,
  PASSWORD_HASH_ROUNDS,
  UPDATE_USER_ERROR_FIELD,
} from './constants/auth.constants.js';
import { AuthUserResponseDto } from './dto/auth-user-response.dto.js';
import { LoginUserDto } from './dto/login.dto.js';
import { SignupUserDto } from './dto/signup.dto.js';
import { tokenError } from './errors/token-error.js';
import type { AuthContext } from './interfaces/auth-context.interface.js';
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

  getCurrentUser({ user, token }: AuthContext): AuthUserResponseDto {
    return this.toAuthResponse(user, token);
  }

  async updateCurrentUser(
    { payload, user: current, token }: AuthContext,
    { email, username, password, bio, image }: UpdateUserFieldsDto,
  ): Promise<AuthUserResponseDto> {
    const fields: UpdateUserInput = Object.fromEntries(
      Object.entries({ email, username, bio, image }).filter(
        ([, value]) => value !== undefined,
      ),
    );
    if (Object.keys(fields).length === 0 && password === undefined) {
      throw new UnprocessableEntityException(
        apiErrors({ [UPDATE_USER_ERROR_FIELD]: [BLANK_MESSAGE] }),
      );
    }

    const [, passwordHash] = await Promise.all([
      this.assertAvailableFor(current.id, fields),
      password === undefined
        ? undefined
        : bcrypt.hash(password, PASSWORD_HASH_ROUNDS),
    ]);
    const changes: UpdateUserInput =
      passwordHash === undefined
        ? fields
        : { ...fields, passwordHash, passwordChangedJti: payload.jti };

    const user = await this.usersService
      .update(current.id, changes)
      .catch((error: unknown) =>
        this.handleUpdateError(error, current.id, changes),
      );
    if (!user) {
      throw tokenError(INVALID_TOKEN_MESSAGE);
    }
    return this.toAuthResponse(user, token);
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

  private async handleUpdateError(
    error: unknown,
    id: number,
    changes: UpdateUserInput,
  ): Promise<never> {
    if (isUniqueViolation(error)) {
      await this.assertAvailableFor(id, changes);
    }
    throw new UserUpdateFailedError(error);
  }

  private async assertAvailableFor(
    id: number,
    { email, username }: UpdateUserInput,
  ): Promise<void> {
    const others = await this.usersService.findOthersByEmailOrUsername(id, {
      email,
      username,
    });
    const errors: ApiErrors = {};
    if (email !== undefined && others.some((user) => user.email === email)) {
      errors.email = [TAKEN_MESSAGE];
    }
    if (
      username !== undefined &&
      others.some((user) => user.username === username)
    ) {
      errors.username = [TAKEN_MESSAGE];
    }
    if (Object.keys(errors).length > 0) {
      throw new ConflictException(apiErrors(errors));
    }
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
    return this.toAuthResponse(user, await this.issueToken(user));
  }

  private issueToken(user: User): Promise<string> {
    const { jwtExpiresIn } = this.configService.getOrThrow<AuthConfig>('auth');
    return this.jwtService.signAsync(
      { sub: user.id },
      { expiresIn: jwtExpiresIn, jwtid: randomUUID() },
    );
  }

  private toAuthResponse(user: User, token: string): AuthUserResponseDto {
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
