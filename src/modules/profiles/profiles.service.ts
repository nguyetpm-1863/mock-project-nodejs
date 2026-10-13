import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { apiErrors } from '../../common/errors/api-errors.js';
import { NOT_FOUND_MESSAGE } from '../articles/constants/article.constants.js';
import type { User } from '../users/entities/user.entity.js';
import { FollowsRepository } from '../users/follows.repository.js';
import {
  FOLLOW_SELF_MESSAGE,
  PROFILE_ERROR_FIELD,
} from './constants/profile.constants.js';
import type { ProfileResponseDto } from './dto/profile-response.dto.js';
import { ProfilesRepository } from './profiles.repository.js';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly profilesRepository: ProfilesRepository,
    private readonly followsRepository: FollowsRepository,
  ) {}

  async findByUsername(
    username: string,
    viewer: User | null,
  ): Promise<ProfileResponseDto> {
    const user = await this.findUser(username, viewer);
    const following =
      viewer === null || viewer.id === user.id
        ? false
        : await this.followsRepository.isFollowing(viewer.id, user.id);
    return this.toResponse(user, following);
  }

  async follow(username: string, viewer: User): Promise<ProfileResponseDto> {
    const user = await this.findUser(username, viewer);
    if (user.id === viewer.id) {
      throw new UnprocessableEntityException(
        apiErrors({ [PROFILE_ERROR_FIELD]: [FOLLOW_SELF_MESSAGE] }),
      );
    }
    await this.profilesRepository.addFollow(viewer.id, user.id);
    return this.toResponse(user, true);
  }

  async unfollow(username: string, viewer: User): Promise<ProfileResponseDto> {
    const user = await this.findUser(username, viewer);
    await this.profilesRepository.removeFollow(viewer.id, user.id);
    return this.toResponse(user, false);
  }

  private async findUser(username: string, viewer: User | null): Promise<User> {
    if (viewer?.username === username) {
      return viewer;
    }
    const user = await this.profilesRepository.findByUsername(username);
    if (!user) {
      throw new NotFoundException(
        apiErrors({ [PROFILE_ERROR_FIELD]: [NOT_FOUND_MESSAGE] }),
      );
    }
    return user;
  }

  private toResponse(user: User, following: boolean): ProfileResponseDto {
    return {
      profile: {
        username: user.username,
        bio: user.bio,
        image: user.image,
        following,
      },
    };
  }
}
