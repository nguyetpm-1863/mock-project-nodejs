import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Tag } from './entities/tag.entity.js';

@Injectable()
export class TagsRepository {
  constructor(
    @InjectRepository(Tag)
    private readonly repository: Repository<Tag>,
  ) {}

  async findOrCreateByNames(names: string[]): Promise<Tag[]> {
    await this.repository.upsert(
      names.map((name) => ({ name })),
      { conflictPaths: ['name'], skipUpdateIfNoValuesChanged: true },
    );
    return this.repository.findBy({ name: In(names) });
  }

  async deleteUnusedByIds(ids: number[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    await this.repository.query(
      `DELETE FROM tags t
       WHERE t.id = ANY($1)
         AND NOT EXISTS (SELECT 1 FROM article_tags at WHERE at.tag_id = t.id)`,
      [ids],
    );
  }
}
