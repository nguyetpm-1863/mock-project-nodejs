import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { User } from '../users/entities/user.entity.js';
import { FollowsRepository } from '../users/follows.repository.js';
import { ProfilesController } from './profiles.controller.js';
import { ProfilesRepository } from './profiles.repository.js';
import { ProfilesService } from './profiles.service.js';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([User])],
  controllers: [ProfilesController],
  providers: [ProfilesService, ProfilesRepository, FollowsRepository],
})
export class ProfilesModule {}
