import setupKenex from 'knex'
import {env} from '../env/index.js'

export const config: setupKenex.Knex.Config = {
    client: env.DATABASE_CLIENT,
    connection:
    env.DATABASE_CLIENT === 'sqlite'? 'sqlite3' : 'pg',
    useNullAsDefault: true,
    migrations: {
        extension: 'ts',
        directory: './db/migrations',
    },
}

export const knex = setupKenex(config)