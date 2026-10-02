import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { DEFAULT_RATE_LIMIT_WINDOW_MS } from '../../common/constants/app.constants.js';
import { noCacheResponse } from '../../common/decorators/no-cache-response.decorator.js';
import { AuthService } from './auth.service.js';
import { LOGIN_RATE_LIMIT } from './constants/auth.constants.js';
import { AuthUserResponseDto } from './dto/auth-user-response.dto.js';
import { LoginDto } from './dto/login.dto.js';

@ApiTags('auth')
@Controller('users')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: { limit: LOGIN_RATE_LIMIT, ttl: DEFAULT_RATE_LIMIT_WINDOW_MS },
  })
  @noCacheResponse()
  @ApiOkResponse({ type: AuthUserResponseDto })
  @ApiUnprocessableEntityResponse({
    description: 'Validation failed or email or password is invalid',
  })
  @ApiTooManyRequestsResponse({ description: 'Too many login attempts' })
  login(@Body() { user }: LoginDto): Promise<AuthUserResponseDto> {
    return this.authService.login(user);
  }
}
