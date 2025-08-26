/**
 * Database runtime creation (separated from config to break cycles)
 */

import { Sequelize } from 'sequelize';
import { DatabaseConfig } from './database.config';

export function makeSequelize(dbConfig: DatabaseConfig): Sequelize {
  return new Sequelize(
    dbConfig.database.database,
    dbConfig.database.username,
    dbConfig.database.password,
    {
      host: dbConfig.database.host,
      port: dbConfig.database.port,
      dialect: dbConfig.database.dialect,
      pool: dbConfig.database.pool,
      logging: dbConfig.database.logging,
    }
  );
}

export function makePgSequelize(dbConfig: DatabaseConfig): Sequelize {
  const connectionString = `postgresql://${dbConfig.database.username}:${dbConfig.database.password}@${dbConfig.database.host}:${dbConfig.database.port}/${dbConfig.database.database}`;
  
  return new Sequelize(connectionString, {
    dialect: 'postgres',
    pool: dbConfig.database.pool,
    logging: dbConfig.database.logging,
  });
}