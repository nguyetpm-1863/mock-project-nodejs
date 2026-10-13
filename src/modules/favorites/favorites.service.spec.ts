import { Test } from '@nestjs/testing';
import { ArticlesRepository } from '../articles/articles.repository.js';
import { ArticlesService } from '../articles/articles.service.js';
import { NOT_FOUND_MESSAGE } from '../articles/constants/article.constants.js';
import { FavoritesRepository } from './favorites.repository.js';
import { FavoritesService } from './favorites.service.js';

describe('FavoritesService', () => {
  let service: FavoritesService;
  let stored: { id: number } | null;
  const response = { article: { slug: 'my-article', favorited: true } };
  const favoritesRepository = { add: vi.fn(), remove: vi.fn() };
  const articlesRepository = {
    findBySlug: vi.fn(() => Promise.resolve(stored)),
  };
  const articlesService = {
    findBySlug: vi.fn(() => Promise.resolve(response)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    stored = { id: 10 };
    const moduleRef = await Test.createTestingModule({
      providers: [
        FavoritesService,
        { provide: FavoritesRepository, useValue: favoritesRepository },
        { provide: ArticlesRepository, useValue: articlesRepository },
        { provide: ArticlesService, useValue: articlesService },
      ],
    }).compile();
    service = moduleRef.get(FavoritesService);
  });

  it('adds the favorite then returns the article for the user', async () => {
    await expect(service.favorite('my-article', 1)).resolves.toBe(response);
    expect(favoritesRepository.add).toHaveBeenCalledWith(10, 1);
    expect(articlesService.findBySlug).toHaveBeenCalledWith('my-article', 1);
  });

  it('removes the favorite then returns the article for the user', async () => {
    await expect(service.unfavorite('my-article', 1)).resolves.toBe(response);
    expect(favoritesRepository.remove).toHaveBeenCalledWith(10, 1);
    expect(articlesService.findBySlug).toHaveBeenCalledWith('my-article', 1);
  });

  it.each([
    ['favorite', () => service.favorite('nope', 1)],
    ['unfavorite', () => service.unfavorite('nope', 1)],
  ])(
    'returns 404 article not found on %s for an unknown slug',
    async (_name, call) => {
      stored = null;
      await expect(call()).rejects.toMatchObject({
        status: 404,
        response: { errors: { article: [NOT_FOUND_MESSAGE] } },
      });
      expect(favoritesRepository.add).not.toHaveBeenCalled();
      expect(favoritesRepository.remove).not.toHaveBeenCalled();
    },
  );
});
