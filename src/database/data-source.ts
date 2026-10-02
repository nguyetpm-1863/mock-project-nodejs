import { existsSync } from 'node:fs';
import { DataSource } from 'typeorm';
import databaseConfig from '../config/database.config.js';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

export default new DataSource(databaseConfig());
