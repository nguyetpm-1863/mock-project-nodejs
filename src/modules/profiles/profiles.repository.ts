import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity.js';

@Injectable()
export class ProfilesRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  findByUsername(username: string): Promise<User | null> {
    return this.repository.findOneBy({ username });
  }

  async addFollow(followerId: number, followingId: number): Promise<void> {
    await this.repository.query(
      'INSERT INTO user_follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [followerId, followingId],
    );
  }

  async removeFollow(followerId: number, followingId: number): Promise<void> {
    await this.repository.query(
      'DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId],
    );
  }
}
