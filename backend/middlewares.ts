import { Request, Response, NextFunction } from 'express';
import { getAuthenticatedUser, getUserFromToken } from './auth.js';
import { User } from './types.js';
import { pool } from './db.js';

export interface AuthenticatedRequest extends Request {
	user?: User | null;
}

export const adminAuth = async (
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction
): Promise<void> => {
	const user = await getAuthenticatedUser(req, res);
	if (!user || user.role !== 'admin') {
		res.status(403).json({ message: 'User does not have permissions' });
		return;
	}
	next();
};

export const authCurrentUser = async (
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction
): Promise<void> => {
	const decryptedUser = await getAuthenticatedUser(req, res);
	if (!decryptedUser) {
		res.status(401).json({ message: 'User is not logged in' });
		return;
	}

	const id = req.params.id;
	const formattedId = id?.padStart(3, '0');
	const userId = decryptedUser.id.slice(-3);

	if (formattedId && formattedId !== userId && decryptedUser.role !== 'admin') {
		res.status(403).json({ message: 'User does not have permissions' });
		return;
	}
	next();
};

export const loginAuth = async (
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction
): Promise<void> => {
	const decryptedUser = await getAuthenticatedUser(req, res);
	if (!decryptedUser) {
		res.status(401).send('<h1>User is not logged in</h1>');
		return;
	}
	next();
};

export const refreshToken = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const token = req.cookies?.token;

		if (!token) {
			return res.status(401).send({ message: 'No token provided' });
		}

		const userId = getUserFromToken(token);
		if (!userId) {
			return res.status(401).send({ message: 'Invalid token' });
		}

		const { rows } = await pool.query(
			'SELECT * FROM public.users WHERE id = $1',
			[userId]
		);
		const user = rows[0];
		if (!user) {
			return res.status(404).send({ message: 'User not found' });
		}

		res.setHeader('Set-Cookie', [
			`token=${token}; Path=/; HttpOnly; Max-Age=3600; SameSite=Strict`,
		]);
		next();
	} catch (error) {
		console.error('Błąd przy odświeżaniu tokena:', error);
		return res.status(500).send({ message: 'Internal server error' });
	}
};
