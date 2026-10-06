import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';

@Injectable()
export class FollowsRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    const rows: unknown[] = await this.repository.query(
      'SELECT 1 FROM user_follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId],
    );
    return rows.length > 0;
  }

  async findFollowedIds(
    followerId: number,
    userIds: number[],
  ): Promise<Set<number>> {
    const rows: { following_id: number }[] = await this.repository.query(
      'SELECT following_id FROM user_follows WHERE follower_id = $1 AND following_id = ANY($2)',
      [followerId, userIds],
    );
    return new Set(rows.map((row) => row.following_id));
  }
}
