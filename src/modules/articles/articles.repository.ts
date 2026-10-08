import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type DeepPartial, type EntityManager, Repository } from 'typeorm';
import { Article } from './entities/article.entity.js';

@Injectable()
export class ArticlesRepository {
  constructor(
    @InjectRepository(Article)
    private readonly repository: Repository<Article>,
  ) {}

  save(
    article: DeepPartial<Article>,
    manager: EntityManager = this.repository.manager,
  ): Promise<Article> {
    return manager.getRepository(Article).save(article);
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
    manager: EntityManager = this.repository.manager,
  ): Promise<boolean> {
    const result = await manager.getRepository(Article).update(id, {
      ...fields,
      updatedAt: new Date(),
    });
    return result.affected === 1;
  }

  async deleteById(
    id: number,
    manager: EntityManager = this.repository.manager,
  ): Promise<void> {
    await manager.getRepository(Article).delete(id);
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
