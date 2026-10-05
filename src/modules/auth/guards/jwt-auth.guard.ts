import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  INVALID_TOKEN_MESSAGE,
  MISSING_MESSAGE,
} from '../../../common/constants/error-messages.constants.js';
import { apiErrors } from '../../../common/errors/api-errors.js';
import { AUTH_SCHEME, TOKEN_ERROR_FIELD } from '../constants/auth.constants.js';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface.js';
import type { JwtPayload } from '../interfaces/jwt-payload.interface.js';
import { TokenDenylistService } from '../token-denylist.service.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenDenylist: TokenDenylistService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);
    if (!token) {
      throw this.unauthorized(MISSING_MESSAGE);
    }

    const payload = await this.jwtService
      .verifyAsync<JwtPayload>(token)
      .catch(() => null);
    if (!payload?.jti || (await this.tokenDenylist.isRevoked(payload.jti))) {
      throw this.unauthorized(INVALID_TOKEN_MESSAGE);
    }

    request.auth = payload;
    return true;
  }

  private extractToken(request: AuthenticatedRequest): string | undefined {
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    return scheme === AUTH_SCHEME && token ? token : undefined;
  }

  private unauthorized(message: string): UnauthorizedException {
    return new UnauthorizedException(
      apiErrors({ [TOKEN_ERROR_FIELD]: [message] }),
    );
  }
}
