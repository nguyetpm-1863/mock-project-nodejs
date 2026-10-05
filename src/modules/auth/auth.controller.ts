import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiSecurity,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { noCacheResponse } from '../../common/decorators/no-cache-response.decorator.js';
import { UpdateUserDto } from '../users/dto/update-user.dto.js';
import { AUTH_THROTTLE } from './auth-throttle.js';
import { AuthService } from './auth.service.js';
import { AUTH_SCHEME } from './constants/auth.constants.js';
import { CurrentAuth } from './decorators/current-auth.decorator.js';
import { AuthUserResponseDto } from './dto/auth-user-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { SignupDto } from './dto/signup.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import type { AuthContext } from './interfaces/auth-context.interface.js';

@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('users')
  @Throttle(AUTH_THROTTLE)
  @noCacheResponse()
  @ApiCreatedResponse({ type: AuthUserResponseDto })
  @ApiConflictResponse({ description: 'Email or username already taken' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed' })
  @ApiTooManyRequestsResponse({ description: 'Too many signup attempts' })
  signup(@Body() { user }: SignupDto): Promise<AuthUserResponseDto> {
    return this.authService.signup(user);
  }

  @Post('users/login')
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

  @Post('user/logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @noCacheResponse()
  @ApiSecurity(AUTH_SCHEME)
  @ApiNoContentResponse({ description: 'Token revoked' })
  @ApiUnauthorizedResponse({ description: 'Token is missing or invalid' })
  logout(@CurrentAuth() { payload }: AuthContext): Promise<void> {
    return this.authService.logout(payload);
  }

  @Get('user')
  @UseGuards(JwtAuthGuard)
  @noCacheResponse()
  @ApiSecurity(AUTH_SCHEME)
  @ApiOkResponse({ type: AuthUserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token is missing or invalid' })
  getCurrentUser(@CurrentAuth() auth: AuthContext): AuthUserResponseDto {
    return this.authService.getCurrentUser(auth);
  }

  @Put('user')
  @UseGuards(JwtAuthGuard)
  @noCacheResponse()
  @ApiSecurity(AUTH_SCHEME)
  @ApiOkResponse({ type: AuthUserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token is missing or invalid' })
  @ApiConflictResponse({ description: 'Email or username already taken' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed' })
  updateCurrentUser(
    @CurrentAuth() auth: AuthContext,
    @Body() { user }: UpdateUserDto,
  ): Promise<AuthUserResponseDto> {
    return this.authService.updateCurrentUser(auth, user);
  }
}
