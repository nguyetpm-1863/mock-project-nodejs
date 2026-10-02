import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { noCacheResponse } from '../../common/decorators/no-cache-response.decorator.js';
import { AUTH_THROTTLE } from './auth-throttle.js';
import { AuthService } from './auth.service.js';
import { AuthUserResponseDto } from './dto/auth-user-response.dto.js';
import { LoginDto } from './dto/login.dto.js';

@ApiTags('auth')
@Controller('users')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  @noCacheResponse()
  @ApiOkResponse({ type: AuthUserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Email or password is invalid' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed' })
  @ApiTooManyRequestsResponse({ description: 'Too many login attempts' })
  login(@Body() { user }: LoginDto): Promise<AuthUserResponseDto> {
    return this.authService.login(user);
  }
}
