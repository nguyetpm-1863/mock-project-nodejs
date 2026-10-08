import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { BLANK_MESSAGE } from '../../common/constants/error-messages.constants.js';
import type { Tag } from '../tags/entities/tag.entity.js';
import { TagsRepository } from '../tags/tags.repository.js';
import type { User } from '../users/entities/user.entity.js';
import { FollowsRepository } from '../users/follows.repository.js';
import { ArticlesRepository } from './articles.repository.js';
import { ArticlesService } from './articles.service.js';
import {
  FORBIDDEN_MESSAGE,
  NOT_FOUND_MESSAGE,
} from './constants/article.constants.js';
import type { Article } from './entities/article.entity.js';

describe('ArticlesService', () => {
  let service: ArticlesService;
  let stored: Partial<Article> | null;
  const articlesRepository = {
    findBySlug: vi.fn(() => Promise.resolve(stored)),
    updateFields: vi.fn(() => Promise.resolve(true)),
    save: vi.fn(),
    deleteById: vi.fn(),
    countFavorites: vi.fn(() => Promise.resolve(0)),
    isFavoritedBy: vi.fn(() => Promise.resolve(false)),
  };
  const tagsRepository = {
    findOrCreateByNames: vi.fn((names: string[]) =>
      Promise.resolve(names.map((name, index) => ({ id: 100 + index, name }))),
    ),
    deleteUnusedByIds: vi.fn(),
  };
  const manager = { name: 'transaction-manager' };
  const dataSource = {
    transaction: vi.fn((work: (m: typeof manager) => unknown) => work(manager)),
  };
  const notFound = {
    status: 404,
    response: { errors: { article: [NOT_FOUND_MESSAGE] } },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    stored = {
      id: 10,
      slug: 'my-article',
      author: { id: 1 } as User,
      tags: [{ id: 7, name: 'old' } as Tag],
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ArticlesService,
        { provide: ArticlesRepository, useValue: articlesRepository },
        { provide: TagsRepository, useValue: tagsRepository },
        { provide: FollowsRepository, useValue: { isFollowing: vi.fn() } },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = moduleRef.get(ArticlesService);
  });

  it('returns 404 with the article field for an unknown slug', async () => {
    stored = null;
    await expect(service.findBySlug('nope', null)).rejects.toMatchObject(
      notFound,
    );
  });

  it.each([
    ['update', () => service.update('my-article', 2, { body: 'x' })],
    ['remove', () => service.remove('my-article', 2)],
  ])('forbids %s by a user who is not the author', async (_name, call) => {
    await expect(call()).rejects.toMatchObject({
      status: 403,
      response: { errors: { article: [FORBIDDEN_MESSAGE] } },
    });
    expect(articlesRepository.updateFields).not.toHaveBeenCalled();
    expect(articlesRepository.deleteById).not.toHaveBeenCalled();
  });

  it("rejects an update without any field as can't be blank", async () => {
    await expect(service.update('my-article', 1, {})).rejects.toMatchObject({
      status: 422,
      response: { errors: { article: [BLANK_MESSAGE] } },
    });
  });

  it('returns 404 when the article is deleted before the update lands', async () => {
    articlesRepository.updateFields.mockResolvedValueOnce(false);
    await expect(
      service.update('my-article', 1, { body: 'x' }),
    ).rejects.toMatchObject(notFound);
  });

  it('replaces tags and cleans up old ones in one transaction', async () => {
    await service.update('my-article', 1, { tagList: ['new'] });

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(articlesRepository.updateFields).toHaveBeenCalledWith(
      10,
      {},
      manager,
    );
    expect(articlesRepository.save).toHaveBeenCalledWith(
      { id: 10, tags: [{ id: 100, name: 'new' }] },
      manager,
    );
    expect(tagsRepository.deleteUnusedByIds).toHaveBeenCalledWith([7], manager);
  });

  it('keeps tags untouched when tagList is omitted', async () => {
    await service.update('my-article', 1, { body: 'x' });

    expect(articlesRepository.updateFields).toHaveBeenCalledWith(
      10,
      { body: 'x' },
      manager,
    );
    expect(articlesRepository.save).not.toHaveBeenCalled();
    expect(tagsRepository.deleteUnusedByIds).not.toHaveBeenCalled();
  });

  it('creates tags and the article in one transaction', async () => {
    const result = await service.create(1, {
      title: 'Hello',
      description: 'd',
      body: 'b',
      tagList: ['a', 'a'],
    });

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(tagsRepository.findOrCreateByNames).toHaveBeenCalledWith(
      ['a'],
      manager,
    );
    const [saved, usedManager] = articlesRepository.save.mock.calls[0] as [
      { slug: string; title: string; author: { id: number } },
      unknown,
    ];
    expect(usedManager).toBe(manager);
    expect(saved).toMatchObject({ title: 'Hello', author: { id: 1 } });
    expect(saved.slug).toMatch(/^hello-[0-9a-f]{8}$/);
    expect(articlesRepository.findBySlug).toHaveBeenCalledWith(saved.slug);
    expect(result.article.slug).toBe('my-article');
  });

  it('removes the article and its unused tags in one transaction', async () => {
    await service.remove('my-article', 1);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(articlesRepository.deleteById).toHaveBeenCalledWith(10, manager);
    expect(tagsRepository.deleteUnusedByIds).toHaveBeenCalledWith([7], manager);
  });

  it.each([
    ['update', () => service.update('my-article', 1, { tagList: ['new'] })],
    ['remove', () => service.remove('my-article', 1)],
  ])(
    'fails the whole %s when cleaning up unused tags fails',
    async (_name, call) => {
      tagsRepository.deleteUnusedByIds.mockRejectedValueOnce(
        new Error('connection lost'),
      );

      await expect(call()).rejects.toThrow('connection lost');
    },
  );
});
