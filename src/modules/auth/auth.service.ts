import {
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { INVALID_MESSAGE } from '../../common/constants/error-messages.constants.js';
import { apiErrors } from '../../common/errors/api-errors.js';
import type { AuthConfig } from '../../config/auth.config.js';
import { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import {
  CREDENTIALS_ERROR_FIELD,
  FALLBACK_SECRET_BYTES,
  PASSWORD_HASH_ROUNDS,
} from './constants/auth.constants.js';
import { AuthUserResponseDto } from './dto/auth-user-response.dto.js';
import { LoginUserDto } from './dto/login.dto.js';

@Injectable()
export class AuthService implements OnModuleInit {
  private unknownUserHash: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.unknownUserHash = await bcrypt.hash(
      randomBytes(FALLBACK_SECRET_BYTES).toString('hex'),
      PASSWORD_HASH_ROUNDS,
    );
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

  private async buildAuthResponse(user: User): Promise<AuthUserResponseDto> {
    const { jwtExpiresIn } = this.configService.getOrThrow<AuthConfig>('auth');
    const token = await this.jwtService.signAsync(
      { sub: user.id, username: user.username },
      { expiresIn: jwtExpiresIn },
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
