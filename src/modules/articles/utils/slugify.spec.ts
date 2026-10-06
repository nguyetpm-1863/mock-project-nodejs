import { generateSlug, slugifyTitle } from './slugify.js';

describe('slugify', () => {
  it.each([
    ['How to train your dragon', 'how-to-train-your-dragon'],
    ['  Hello, World!!  ', 'hello-world'],
    ['Đường đến Hà Nội', 'duong-den-ha-noi'],
    ['C++ & Node.js', 'c-node-js'],
  ])('turns %j into %j', (title, slug) => {
    expect(slugifyTitle(title)).toBe(slug);
  });

  it('adds a random suffix so equal titles get different slugs', () => {
    const first = generateSlug('Same title');
    const second = generateSlug('Same title');
    expect(first).toMatch(/^same-title-[0-9a-f]{8}$/);
    expect(first).not.toBe(second);
  });

  it('falls back to a default base for titles without letters or digits', () => {
    expect(generateSlug('!!!')).toMatch(/^article-[0-9a-f]{8}$/);
  });
});
