import { Test } from '@nestjs/testing';
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

  it('replaces tags and cleans up the ones no longer used', async () => {
    await service.update('my-article', 1, { tagList: ['new'] });

    expect(articlesRepository.save).toHaveBeenCalledWith({
      id: 10,
      tags: [{ id: 100, name: 'new' }],
    });
    expect(tagsRepository.deleteUnusedByIds).toHaveBeenCalledWith([7]);
  });

  it('keeps tags untouched when tagList is omitted', async () => {
    await service.update('my-article', 1, { body: 'x' });

    expect(articlesRepository.updateFields).toHaveBeenCalledWith(10, {
      body: 'x',
    });
    expect(articlesRepository.save).not.toHaveBeenCalled();
    expect(tagsRepository.deleteUnusedByIds).not.toHaveBeenCalled();
  });

  it('removes the article and its unused tags', async () => {
    await service.remove('my-article', 1);

    expect(articlesRepository.deleteById).toHaveBeenCalledWith(10);
    expect(tagsRepository.deleteUnusedByIds).toHaveBeenCalledWith([7]);
  });

  it.each([
    ['update', () => service.update('my-article', 1, { tagList: ['new'] })],
    ['remove', () => service.remove('my-article', 1)],
  ])(
    'still succeeds when cleaning up unused tags fails on %s',
    async (_name, call) => {
      tagsRepository.deleteUnusedByIds.mockRejectedValueOnce(
        new Error('connection lost'),
      );

      await expect(call()).resolves.not.toThrow();
      expect(tagsRepository.deleteUnusedByIds).toHaveBeenCalledWith([7]);
    },
  );
});
