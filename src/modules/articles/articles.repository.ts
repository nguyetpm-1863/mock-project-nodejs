import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type DeepPartial, type EntityManager, Repository } from 'typeorm';
import { Article } from './entities/article.entity.js';
import type { ArticleFilters } from './interfaces/article-filters.interface.js';

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

  findPage(filters: ArticleFilters): Promise<[Article[], number]> {
    const query = this.repository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .leftJoinAndSelect('article.tags', 'tag');

    if (filters.author) {
      query.andWhere('author.username = :author', { author: filters.author });
    }
    if (filters.tag) {
      query.andWhere(
        `article.id IN (
          SELECT at.article_id FROM article_tags at
          JOIN tags t ON t.id = at.tag_id
          WHERE t.name = :tag)`,
        { tag: filters.tag },
      );
    }
    if (filters.favorited) {
      query.andWhere(
        `article.id IN (
          SELECT af.article_id FROM article_favorites af
          JOIN users u ON u.id = af.user_id
          WHERE u.username = :favorited)`,
        { favorited: filters.favorited },
      );
    }
    if (filters.followedBy !== undefined) {
      query.andWhere(
        `author.id IN (
          SELECT uf.following_id FROM user_follows uf
          WHERE uf.follower_id = :followerId)`,
        { followerId: filters.followedBy },
      );
    }

    return query
      .orderBy('article.createdAt', 'DESC')
      .addOrderBy('article.id', 'DESC')
      .skip(filters.offset)
      .take(filters.limit)
      .getManyAndCount();
  }

  async countFavoritesByArticleIds(
    articleIds: number[],
  ): Promise<Map<number, number>> {
    const rows: { article_id: number; count: string }[] =
      await this.repository.query(
        'SELECT article_id, COUNT(*) AS count FROM article_favorites WHERE article_id = ANY($1) GROUP BY article_id',
        [articleIds],
      );
    return new Map(rows.map((row) => [row.article_id, Number(row.count)]));
  }

  async findFavoritedArticleIds(
    userId: number,
    articleIds: number[],
  ): Promise<Set<number>> {
    const rows: { article_id: number }[] = await this.repository.query(
      'SELECT article_id FROM article_favorites WHERE user_id = $1 AND article_id = ANY($2)',
      [userId, articleIds],
    );
    return new Set(rows.map((row) => row.article_id));
  }
}
