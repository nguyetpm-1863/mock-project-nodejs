export interface ArticleFilters {
  tag?: string;
  author?: string;
  favorited?: string;
  followedBy?: number;
  limit: number;
  offset: number;
}
