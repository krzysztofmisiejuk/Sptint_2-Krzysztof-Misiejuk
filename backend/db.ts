import dotenv from 'dotenv';
import pg from 'pg';
const { Pool } = pg;
dotenv.config();

export const pool = new Pool({
	user: process.env.POSTGRES_USER,
	host: process.env.POSTGRES_HOST,
	database: process.env.POSTGRES_DB,
	password: process.env.POSTGRES_PASSWORD,
	port: 5433,
});