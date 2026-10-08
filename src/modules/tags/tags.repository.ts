import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type EntityManager, In, Repository } from 'typeorm';
import { Tag } from './entities/tag.entity.js';

@Injectable()
export class TagsRepository {
  constructor(
    @InjectRepository(Tag)
    private readonly repository: Repository<Tag>,
  ) {}

  async findOrCreateByNames(
    names: string[],
    manager: EntityManager = this.repository.manager,
  ): Promise<Tag[]> {
    const tagRepository = manager.getRepository(Tag);
    await tagRepository.upsert(
      names.map((name) => ({ name })),
      { conflictPaths: ['name'], skipUpdateIfNoValuesChanged: true },
    );
    return tagRepository.findBy({ name: In(names) });
  }

  async deleteUnusedByIds(
    ids: number[],
    manager: EntityManager = this.repository.manager,
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    await manager.query(
      `DELETE FROM tags t
       WHERE t.id = ANY($1)
         AND NOT EXISTS (SELECT 1 FROM article_tags at WHERE at.tag_id = t.id)`,
      [ids],
    );
  }
}
