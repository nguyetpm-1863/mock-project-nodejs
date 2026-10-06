export interface UpdateUserInput {
  email?: string;
  username?: string;
  passwordHash?: string;
  passwordChangedJti?: string;
  bio?: string | null;
  image?: string | null;
}
