import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type DeepPartial, Repository } from 'typeorm';
import { Comment } from './entities/comment.entity.js';

@Injectable()
export class CommentsRepository {
  constructor(
    @InjectRepository(Comment)
    private readonly repository: Repository<Comment>,
  ) {}

  save(comment: DeepPartial<Comment>): Promise<Comment> {
    return this.repository.save(comment);
  }

  findInArticle(articleId: number, id: number): Promise<Comment | null> {
    return this.repository.findOne({
      where: { id, article: { id: articleId } },
      relations: { author: true },
    });
  }

  findByArticleId(articleId: number): Promise<Comment[]> {
    return this.repository.find({
      where: { article: { id: articleId } },
      relations: { author: true },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
  }

  async deleteById(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}
