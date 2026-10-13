import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ArticlesService } from '../articles/articles.service.js';
import { FavoritesRepository } from './favorites.repository.js';
import { FavoritesService } from './favorites.service.js';

describe('FavoritesService', () => {
  let service: FavoritesService;
  const article = { id: 10, slug: 'my-article' };
  const response = { article: { slug: 'my-article', favorited: true } };
  const favoritesRepository = { add: vi.fn(), remove: vi.fn() };
  const articlesService = {
    findArticle: vi.fn(() => Promise.resolve(article)),
    toResponse: vi.fn(() => Promise.resolve(response)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        FavoritesService,
        { provide: FavoritesRepository, useValue: favoritesRepository },
        { provide: ArticlesService, useValue: articlesService },
      ],
    }).compile();
    service = moduleRef.get(FavoritesService);
  });

  it('adds the favorite and builds the response from the loaded article', async () => {
    await expect(service.favorite('my-article', 1)).resolves.toBe(response);
    expect(articlesService.findArticle).toHaveBeenCalledTimes(1);
    expect(favoritesRepository.add).toHaveBeenCalledWith(10, 1);
    expect(articlesService.toResponse).toHaveBeenCalledWith(article, 1);
  });

  it('removes the favorite and builds the response from the loaded article', async () => {
    await expect(service.unfavorite('my-article', 1)).resolves.toBe(response);
    expect(articlesService.findArticle).toHaveBeenCalledTimes(1);
    expect(favoritesRepository.remove).toHaveBeenCalledWith(10, 1);
    expect(articlesService.toResponse).toHaveBeenCalledWith(article, 1);
  });

  it.each([
    ['favorite', () => service.favorite('nope', 1)],
    ['unfavorite', () => service.unfavorite('nope', 1)],
  ])(
    'writes nothing on %s when the article is not found',
    async (_name, call) => {
      const notFound = new NotFoundException();
      articlesService.findArticle.mockRejectedValueOnce(notFound);
      await expect(call()).rejects.toBe(notFound);
      expect(favoritesRepository.add).not.toHaveBeenCalled();
      expect(favoritesRepository.remove).not.toHaveBeenCalled();
    },
  );
});
