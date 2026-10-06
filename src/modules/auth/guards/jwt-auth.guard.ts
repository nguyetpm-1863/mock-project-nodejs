import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  INVALID_TOKEN_MESSAGE,
  MISSING_MESSAGE,
} from '../../../common/constants/error-messages.constants.js';
import type { User } from '../../users/entities/user.entity.js';
import { UsersService } from '../../users/users.service.js';
import {
  AUTH_SCHEME,
  MILLISECONDS_PER_SECOND,
} from '../constants/auth.constants.js';
import { tokenError } from '../errors/token-error.js';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface.js';
import type { JwtPayload } from '../interfaces/jwt-payload.interface.js';
import { TokenDenylistService } from '../token-denylist.service.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenDenylist: TokenDenylistService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);
    if (!token) {
      throw tokenError(MISSING_MESSAGE);
    }

    const payload = await this.jwtService
      .verifyAsync<JwtPayload>(token)
      .catch(() => null);
    if (!payload?.jti) {
      throw tokenError(INVALID_TOKEN_MESSAGE);
    }

    const [isRevoked, user] = await Promise.all([
      this.tokenDenylist.isRevoked(payload.jti),
      this.usersService.findById(payload.sub),
    ]);
    if (
      isRevoked ||
      !user ||
      this.isIssuedBeforePasswordChange(payload, user)
    ) {
      throw tokenError(INVALID_TOKEN_MESSAGE);
    }

    request.auth = { payload, token, user };
    return true;
  }

  private extractToken(request: AuthenticatedRequest): string | undefined {
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    return scheme === AUTH_SCHEME && token ? token : undefined;
  }

  private isIssuedBeforePasswordChange(
    { iat, jti }: JwtPayload,
    { passwordChangedAt, passwordChangedJti }: User,
  ): boolean {
    return (
      passwordChangedAt !== null &&
      jti !== passwordChangedJti &&
      iat < Math.floor(passwordChangedAt.getTime() / MILLISECONDS_PER_SECOND)
    );
  }
}
