export class TestDatabaseError extends Error {
  constructor(database: string, suffix: string) {
    super(`E2E database "${database}" must end with "${suffix}"`);
    this.name = TestDatabaseError.name;
  }
}
