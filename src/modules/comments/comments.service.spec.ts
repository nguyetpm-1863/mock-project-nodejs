import { Test } from '@nestjs/testing';
import {
  FORBIDDEN_MESSAGE,
  NOT_FOUND_MESSAGE,
} from '../articles/constants/article.constants.js';
import type { User } from '../users/entities/user.entity.js';
import { ArticlesRepository } from '../articles/articles.repository.js';
import { FollowsRepository } from '../users/follows.repository.js';
import { CommentsRepository } from './comments.repository.js';
import { CommentsService } from './comments.service.js';
import type { Comment } from './entities/comment.entity.js';

describe('CommentsService', () => {
  let service: CommentsService;
  let articleId: number | null;
  let stored: Comment | null;
  const author = { id: 1, username: 'jake', bio: null, image: null } as User;
  const commentsRepository = {
    findInArticle: vi.fn(() => Promise.resolve(stored)),
    findByArticleId: vi.fn(() => Promise.resolve(stored ? [stored] : [])),
    save: vi.fn((comment: object) => Promise.resolve({ ...comment, id: 7 })),
    deleteById: vi.fn(),
  };
  const articlesRepository = {
    findBySlug: vi.fn(() =>
      Promise.resolve(articleId === null ? null : { id: articleId }),
    ),
  };
  const followsRepository = {
    findFollowedIds: vi.fn(() => Promise.resolve(new Set([1]))),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    articleId = 10;
    stored = { id: 5, body: 'Nice', author } as Comment;
    const moduleRef = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: CommentsRepository, useValue: commentsRepository },
        { provide: ArticlesRepository, useValue: articlesRepository },
        { provide: FollowsRepository, useValue: followsRepository },
      ],
    }).compile();
    service = moduleRef.get(CommentsService);
  });

  it.each([
    ['create', () => service.create('nope', 1, { body: 'x' })],
    ['list', () => service.list('nope', null)],
    ['remove', () => service.remove('nope', 5, 1)],
  ])(
    'returns 404 article not found on %s for an unknown slug',
    async (_name, call) => {
      articleId = null;
      await expect(call()).rejects.toMatchObject({
        status: 404,
        response: { errors: { article: [NOT_FOUND_MESSAGE] } },
      });
    },
  );

  it('returns 404 comment not found when the comment is not in the article', async () => {
    stored = null;
    await expect(service.remove('my-article', 99, 1)).rejects.toMatchObject({
      status: 404,
      response: { errors: { comment: [NOT_FOUND_MESSAGE] } },
    });
    expect(commentsRepository.deleteById).not.toHaveBeenCalled();
  });

  it('forbids deleting a comment written by someone else', async () => {
    await expect(service.remove('my-article', 5, 2)).rejects.toMatchObject({
      status: 403,
      response: { errors: { comment: [FORBIDDEN_MESSAGE] } },
    });
    expect(commentsRepository.deleteById).not.toHaveBeenCalled();
  });

  it('deletes the comment for its author', async () => {
    await service.remove('my-article', 5, 1);
    expect(commentsRepository.deleteById).toHaveBeenCalledWith(5);
  });

  it('creates a comment authored by the current user', async () => {
    const { comment } = await service.create('my-article', author, {
      body: 'Hi',
    });
    expect(commentsRepository.save).toHaveBeenCalledWith({
      body: 'Hi',
      author: { id: 1 },
      article: { id: 10 },
    });
    expect(comment).toMatchObject({
      id: 7,
      body: 'Hi',
      author: { username: 'jake', bio: null, image: null },
    });
  });

  it('lists comments without following lookups for anonymous viewers', async () => {
    const { comments } = await service.list('my-article', null);
    expect(comments[0].author.following).toBe(false);
    expect(followsRepository.findFollowedIds).not.toHaveBeenCalled();
  });

  it('marks followed authors for a signed-in viewer', async () => {
    const { comments } = await service.list('my-article', 2);
    expect(comments[0].author.following).toBe(true);
    expect(followsRepository.findFollowedIds).toHaveBeenCalledWith(2, [1]);
  });
});
