export class UserUpdateFailedError extends Error {
  constructor(cause: unknown) {
    super('Failed to update user', { cause });
    this.name = UserUpdateFailedError.name;
  }
}
