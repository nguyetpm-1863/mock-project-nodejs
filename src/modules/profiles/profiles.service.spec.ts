import { Test } from '@nestjs/testing';
import { NOT_FOUND_MESSAGE } from '../articles/constants/article.constants.js';
import type { User } from '../users/entities/user.entity.js';
import { FollowsRepository } from '../users/follows.repository.js';
import { FOLLOW_SELF_MESSAGE } from './constants/profile.constants.js';
import { ProfilesRepository } from './profiles.repository.js';
import { ProfilesService } from './profiles.service.js';

describe('ProfilesService', () => {
  let service: ProfilesService;
  let stored: User | null;
  const profile = { username: 'celeb', bio: null, image: null };
  const viewer = { id: 1, username: 'reader', bio: 'hi', image: null } as User;
  const profilesRepository = {
    findByUsername: vi.fn(() => Promise.resolve(stored)),
    addFollow: vi.fn(),
    removeFollow: vi.fn(),
  };
  const followsRepository = {
    isFollowing: vi.fn(() => Promise.resolve(true)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    stored = { id: 2, ...profile } as User;
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProfilesService,
        { provide: ProfilesRepository, useValue: profilesRepository },
        { provide: FollowsRepository, useValue: followsRepository },
      ],
    }).compile();
    service = moduleRef.get(ProfilesService);
  });

  it.each([
    ['get', () => service.findByUsername('nope', null)],
    ['follow', () => service.follow('nope', viewer)],
    ['unfollow', () => service.unfollow('nope', viewer)],
  ])(
    'returns 404 profile not found on %s for an unknown username',
    async (_name, call) => {
      stored = null;
      await expect(call()).rejects.toMatchObject({
        status: 404,
        response: { errors: { profile: [NOT_FOUND_MESSAGE] } },
      });
      expect(profilesRepository.addFollow).not.toHaveBeenCalled();
      expect(profilesRepository.removeFollow).not.toHaveBeenCalled();
    },
  );

  it('returns following false without a lookup for anonymous viewers', async () => {
    await expect(service.findByUsername('celeb', null)).resolves.toEqual({
      profile: { ...profile, following: false },
    });
    expect(followsRepository.isFollowing).not.toHaveBeenCalled();
  });

  it('returns following for a signed-in viewer', async () => {
    await expect(service.findByUsername('celeb', viewer)).resolves.toEqual({
      profile: { ...profile, following: true },
    });
    expect(followsRepository.isFollowing).toHaveBeenCalledWith(1, 2);
  });

  it('returns your own profile without querying the database', async () => {
    await expect(service.findByUsername('reader', viewer)).resolves.toEqual({
      profile: { username: 'reader', bio: 'hi', image: null, following: false },
    });
    expect(profilesRepository.findByUsername).not.toHaveBeenCalled();
    expect(followsRepository.isFollowing).not.toHaveBeenCalled();
  });

  it('follows the user', async () => {
    await expect(service.follow('celeb', viewer)).resolves.toEqual({
      profile: { ...profile, following: true },
    });
    expect(profilesRepository.addFollow).toHaveBeenCalledWith(1, 2);
  });

  it('refuses to follow yourself without querying the database', async () => {
    await expect(service.follow('reader', viewer)).rejects.toMatchObject({
      status: 422,
      response: { errors: { profile: [FOLLOW_SELF_MESSAGE] } },
    });
    expect(profilesRepository.findByUsername).not.toHaveBeenCalled();
    expect(profilesRepository.addFollow).not.toHaveBeenCalled();
  });

  it('unfollows the user', async () => {
    await expect(service.unfollow('celeb', viewer)).resolves.toEqual({
      profile: { ...profile, following: false },
    });
    expect(profilesRepository.removeFollow).toHaveBeenCalledWith(1, 2);
  });
});
