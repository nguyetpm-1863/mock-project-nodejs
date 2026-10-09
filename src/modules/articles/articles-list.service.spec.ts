import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import type { Tag } from '../tags/entities/tag.entity.js';
import { TagsRepository } from '../tags/tags.repository.js';
import type { User } from '../users/entities/user.entity.js';
import { FollowsRepository } from '../users/follows.repository.js';
import { ArticlesRepository } from './articles.repository.js';
import { ArticlesService } from './articles.service.js';
import type { Article } from './entities/article.entity.js';

describe('ArticlesService list and feed', () => {
  let service: ArticlesService;
  const article = {
    id: 10,
    slug: 'first',
    title: 'First',
    description: 'Desc',
    body: 'Body',
    tags: [{ name: 'b' }, { name: 'a' }] as Tag[],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    author: { id: 1, username: 'jake', bio: null, image: null } as User,
  } as Article;
  const articlesRepository = {
    findPage: vi.fn(),
    countFavoritesByArticleIds: vi.fn(),
    findFavoritedArticleIds: vi.fn(),
  };
  const followsRepository = { findFollowedIds: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    articlesRepository.findPage.mockResolvedValue([[article], 5]);
    articlesRepository.countFavoritesByArticleIds.mockResolvedValue(
      new Map([[10, 3]]),
    );
    articlesRepository.findFavoritedArticleIds.mockResolvedValue(new Set([10]));
    followsRepository.findFollowedIds.mockResolvedValue(new Set([1]));

    const moduleRef = await Test.createTestingModule({
      providers: [
        ArticlesService,
        { provide: ArticlesRepository, useValue: articlesRepository },
        { provide: TagsRepository, useValue: {} },
        { provide: FollowsRepository, useValue: followsRepository },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(ArticlesService);
  });

  it('maps a page without body and with viewer state', async () => {
    const result = await service.list({ limit: 20, offset: 0 }, 2);

    expect(result.articlesCount).toBe(5);
    expect(result.articles[0]).toEqual({
      slug: 'first',
      title: 'First',
      description: 'Desc',
      tagList: ['a', 'b'],
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      favorited: true,
      favoritesCount: 3,
      author: { username: 'jake', bio: null, image: null, following: true },
    });
  });

  it('skips viewer lookups for anonymous readers', async () => {
    const result = await service.list({ limit: 20, offset: 0 }, null);

    expect(result.articles[0]).toMatchObject({
      favorited: false,
      author: { following: false },
    });
    expect(articlesRepository.findFavoritedArticleIds).not.toHaveBeenCalled();
    expect(followsRepository.findFollowedIds).not.toHaveBeenCalled();
  });

  it('returns an empty page without extra queries', async () => {
    articlesRepository.findPage.mockResolvedValueOnce([[], 0]);

    const result = await service.list({ limit: 20, offset: 40 }, 2);

    expect(result).toEqual({ articles: [], articlesCount: 0 });
    expect(
      articlesRepository.countFavoritesByArticleIds,
    ).not.toHaveBeenCalled();
  });

  it('builds the feed from users the viewer follows', async () => {
    await service.feed({ limit: 5, offset: 10 }, 2);

    expect(articlesRepository.findPage).toHaveBeenCalledWith({
      followedBy: 2,
      limit: 5,
      offset: 10,
    });
  });
});
