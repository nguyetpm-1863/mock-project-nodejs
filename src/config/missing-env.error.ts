export class MissingEnvError extends Error {
  constructor(key: string) {
    super(`Missing required environment variable ${key}`);
    this.name = MissingEnvError.name;
  }
}
