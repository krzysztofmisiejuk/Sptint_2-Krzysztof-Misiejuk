import express, { Request, Response, NextFunction, Router } from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import bcrypt, { hash } from 'bcrypt';
import { pool } from './db.js';
import { User } from './types.js';

dotenv.config();

const router: Router = express.Router();
const IV_LENGTH = 16;
const algorithm = 'aes-192-cbc';
const TOKEN_KEY = process.env.TOKEN_KEY;

if (!TOKEN_KEY) throw new Error('TOKEN_KEY is not set in .env');
const TOKEN_KEY_BUFFER = Buffer.from(TOKEN_KEY, 'utf8');

function generateToken(userData: string): string {
	const iv = crypto.randomBytes(IV_LENGTH);
	const cipher = crypto.createCipheriv(algorithm, TOKEN_KEY_BUFFER, iv);
	let encrypted = cipher.update(userData, 'utf8', 'hex');
	encrypted += cipher.final('hex');
	return iv.toString('hex') + '.' + encrypted;
}

export function getUserFromToken(token: string): string | null {
	try {
		if (!token) return null;
		const [ivHex, encryptedData] = token.split('.');
		if (!ivHex || !encryptedData) return null;

		const iv = Buffer.from(ivHex, 'hex');
		const decipher = crypto.createDecipheriv(algorithm, TOKEN_KEY_BUFFER, iv);
		let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
		decrypted += decipher.final('utf8');

		return decrypted.startsWith('"') && decrypted.endsWith('"')
			? decrypted.slice(1, -1).trim()
			: decrypted.trim();
	} catch (error) {
		console.error('Decryption error:', error);
		return null;
	}
}

export const getAuthenticatedUser = async (
	req: Request,
	res: Response
): Promise<User | null> => {
	try {
		const token = req.cookies?.token;
		const userId = getUserFromToken(token);
		if (!userId) return null;
		const { rows } = await pool.query(
			'SELECT * FROM public.users WHERE id = $1',
			[userId]
		);
		return rows[0] || null;
	} catch (error) {
		console.error('Error in getAuthenticatedUser:', error);
		return null;
	}
};

router.post('/register', async (req: Request, res: Response) => {
	try {
		const { username, password } = req.body;
		const { rows: existingUsers } = await pool.query(
			'SELECT * FROM public.users WHERE username = $1',
			[username]
		);

		if (existingUsers.length > 0) {
			return res.status(409).json({ message: 'User already exists' });
		}
		const hashedPassword = await bcrypt.hash(password, 12);

		if (!hashedPassword) {
			return res.status(500).json({ message: 'Error hashing password' });
		}

		const { rows } = await pool.query(
			'INSERT INTO public.users (username, password, role, balance) VALUES ($1, $2, $3, $4) RETURNING id',
			[username, hashedPassword, 'user', 1000]
		);
		const newUserId: string = rows[0].id;
		const newUser: User = {
			id: `user${newUserId.toString().padStart(3, '0')}`,
			username,
			password: hashedPassword,
			role: 'user',
			balance: 1000,
		};

		res.status(201).json({ message: 'Added new user', user: newUser });
	} catch (error) {
		console.error('Registration error:', error);
		res.status(400).json({ error: 'Invalid data' });
	}
});

router.post('/login', async (req: Request, res: Response) => {
	try {
		const { username, password } = req.body;
		const { rows } = await pool.query(
			'SELECT * FROM public.users WHERE username = $1',
			[username]
		);
		const user: User = rows[0];

		if (!user) {
			return res.status(404).json({ error: 'Username is not exist' });
		}

		const hashedPassword = await bcrypt.compare(password, user.password);

		if (!hashedPassword) {
			return res.status(404).json({ error: 'Wrong password' });
		}

		const token = generateToken(JSON.stringify(user.id));
		if (!token) {
			return res.status(500).json({ error: 'Error generating token' });
		}

		res.cookie('token', token, {
			httpOnly: true,
			maxAge: 3600 * 1000,
			path: '/',
			sameSite: 'strict',
		});

		res.status(200).json(user);
	} catch (error) {
		console.error('Login error:', error);
		res.status(400).json({ error: 'Invalid data' });
	}
});

router.get('/logout', (req: Request, res: Response) => {
	res.clearCookie('token', { path: '/' });
	res.status(200).send({ message: 'Logged out' });
});

router.post('/refresh-token', async (req: Request, res: Response) => {
	const token = req.cookies?.token;

	if (!token) {
		return res.status(401).json({ error: 'No token provided' });
	}

	const userId = getUserFromToken(token);
	if (!userId) {
		return res.status(401).json({ error: 'Invalid token' });
	}

	try {
		const { rows } = await pool.query(
			'SELECT * FROM public.users WHERE id = $1',
			[userId]
		);
		const user = rows[0];
		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		res.cookie('token', token, {
			httpOnly: true,
			maxAge: 3600 * 1000,
			path: '/',
			sameSite: 'strict',
		});

		res.status(200).json({ message: 'Token refreshed' });
	} catch (error) {
		console.error('Refresh token error:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
