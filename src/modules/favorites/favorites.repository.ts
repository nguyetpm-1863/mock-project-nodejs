import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../articles/entities/article.entity.js';

@Injectable()
export class FavoritesRepository {
  constructor(
    @InjectRepository(Article)
    private readonly repository: Repository<Article>,
  ) {}

  async add(articleId: number, userId: number): Promise<void> {
    await this.repository.query(
      'INSERT INTO article_favorites (user_id, article_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, articleId],
    );
  }

  async remove(articleId: number, userId: number): Promise<void> {
    await this.repository.query(
      'DELETE FROM article_favorites WHERE user_id = $1 AND article_id = $2',
      [userId, articleId],
    );
  }
}
