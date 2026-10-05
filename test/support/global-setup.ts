import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  DataSource,
  type DataSourceOptions,
  type MigrationInterface,
} from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions.js';
import databaseConfig from '../../src/config/database.config.js';
import { TestDatabaseError } from './test-database.error.js';
import {
  MAINTENANCE_DATABASE,
  TEST_DATABASE_SUFFIX,
  TEST_ENV_FILES,
} from './test.constants.js';

const migrationsDir = join(
  import.meta.dirname,
  '../../src/database/migrations',
);

const loadTestEnv = (): void => {
  process.env.NODE_ENV = 'test';
  TEST_ENV_FILES.filter((file) => existsSync(file)).forEach((file) =>
    process.loadEnvFile(file),
  );
};

type MigrationClass = new () => MigrationInterface;

const loadMigrations = async (): Promise<MigrationClass[]> => {
  const files = readdirSync(migrationsDir).filter(
    (file) => file.endsWith('.ts') && !file.endsWith('.d.ts'),
  );
  const modules = await Promise.all(
    files.map((file) => import(join(migrationsDir, file))),
  );
  return modules.flatMap((module: Record<string, MigrationClass>) =>
    Object.values(module),
  );
};

const createDatabaseIfMissing = async (
  options: PostgresConnectionOptions,
): Promise<void> => {
  const maintenance = new DataSource({
    ...options,
    database: MAINTENANCE_DATABASE,
    entities: [],
    migrations: [],
  });
  await maintenance.initialize();
  try {
    const rows = await maintenance.query<unknown[]>(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [options.database],
    );
    if (rows.length === 0) {
      await maintenance.query(`CREATE DATABASE "${options.database}"`);
    }
  } finally {
    await maintenance.destroy();
  }
};

export default async function setup(): Promise<void> {
  loadTestEnv();
  const options = databaseConfig() as PostgresConnectionOptions;
  const database = options.database ?? '';
  if (!database.endsWith(TEST_DATABASE_SUFFIX)) {
    throw new TestDatabaseError(database, TEST_DATABASE_SUFFIX);
  }

  await createDatabaseIfMissing(options);

  const dataSource = new DataSource({
    ...options,
    migrations: await loadMigrations(),
  } as DataSourceOptions);
  await dataSource.initialize();
  try {
    await dataSource.runMigrations();
  } finally {
    await dataSource.destroy();
  }
}
