import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type DeepPartial, Repository } from 'typeorm';
import { Article } from './entities/article.entity.js';

@Injectable()
export class ArticlesRepository {
  constructor(
    @InjectRepository(Article)
    private readonly repository: Repository<Article>,
  ) {}

  save(article: DeepPartial<Article>): Promise<Article> {
    return this.repository.save(article);
  }

  findBySlug(slug: string): Promise<Article | null> {
    return this.repository.findOne({
      where: { slug },
      relations: { author: true, tags: true },
    });
  }

  async updateFields(
    id: number,
    fields: DeepPartial<Article>,
  ): Promise<boolean> {
    const result = await this.repository.update(id, {
      ...fields,
      updatedAt: new Date(),
    });
    return result.affected === 1;
  }

  async deleteById(id: number): Promise<void> {
    await this.repository.delete(id);
  }

  async countFavorites(articleId: number): Promise<number> {
    const rows: { count: string }[] = await this.repository.query(
      'SELECT COUNT(*) AS count FROM article_favorites WHERE article_id = $1',
      [articleId],
    );
    return Number(rows[0].count);
  }

  async isFavoritedBy(articleId: number, userId: number): Promise<boolean> {
    const rows: unknown[] = await this.repository.query(
      'SELECT 1 FROM article_favorites WHERE article_id = $1 AND user_id = $2',
      [articleId, userId],
    );
    return rows.length > 0;
  }
}
