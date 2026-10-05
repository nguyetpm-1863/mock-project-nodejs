export class UserCreationFailedError extends Error {
  constructor(cause: unknown) {
    super('Failed to create user', { cause });
    this.name = UserCreationFailedError.name;
  }
}
