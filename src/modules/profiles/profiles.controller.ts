import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { noCacheResponse } from '../../common/decorators/no-cache-response.decorator.js';
import { AUTH_SCHEME } from '../auth/constants/auth.constants.js';
import { CurrentAuth } from '../auth/decorators/current-auth.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthContext } from '../auth/interfaces/auth-context.interface.js';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard.js';
import { ProfileResponseDto } from './dto/profile-response.dto.js';
import { ProfilesService } from './profiles.service.js';

@ApiTags('profiles')
@Controller('profiles/:username')
@ApiSecurity(AUTH_SCHEME)
@ApiUnauthorizedResponse({ description: 'Token is missing or invalid' })
@ApiNotFoundResponse({ description: 'Profile not found' })
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @noCacheResponse()
  @ApiOkResponse({ type: ProfileResponseDto })
  findByUsername(
    @Param('username') username: string,
    @CurrentAuth() auth: AuthContext | undefined,
  ): Promise<ProfileResponseDto> {
    return this.profilesService.findByUsername(username, auth?.user ?? null);
  }

  @Post('follow')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @noCacheResponse()
  @ApiOkResponse({ type: ProfileResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'Cannot follow yourself' })
  follow(
    @Param('username') username: string,
    @CurrentAuth() { user }: AuthContext,
  ): Promise<ProfileResponseDto> {
    return this.profilesService.follow(username, user);
  }

  @Delete('follow')
  @UseGuards(JwtAuthGuard)
  @noCacheResponse()
  @ApiOkResponse({ type: ProfileResponseDto })
  unfollow(
    @Param('username') username: string,
    @CurrentAuth() { user }: AuthContext,
  ): Promise<ProfileResponseDto> {
    return this.profilesService.unfollow(username, user);
  }
}
