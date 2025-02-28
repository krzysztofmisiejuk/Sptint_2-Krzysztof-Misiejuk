import { IncomingMessage, ServerResponse } from 'http';
import { getAuthenticatedUser } from './auth.js';
import { Middelware } from './types.js';

export const setHeader = (
	req: IncomingMessage,
	res: ServerResponse,
	next: Middelware
) => {
	res.setHeader('Content-Type', 'application/json');
	next(req, res);
};

export const adminAuth = async (
	req: IncomingMessage,
	res: ServerResponse,
	next: Middelware
): Promise<void> => {
	const user = await getAuthenticatedUser(req, res);
	if (user?.role !== 'admin') {
		res.statusCode = 403;
		res.end(JSON.stringify({ message: 'User does not have permissions' }));
		return;
	}

	next(req, res);
};

export const authCurrentUser = async (
	req: IncomingMessage,
	res: ServerResponse,
	id: string | undefined,
	next: Middelware
): Promise<void> => {
	const decryptedUser = await getAuthenticatedUser(req, res);
	if (!decryptedUser) return;

	const formattedId = id?.padStart(3, '0');
	const userId = decryptedUser.id.slice(-3);

	if (formattedId !== userId && decryptedUser.role !== 'admin') {
		res.statusCode = 403;
		res.end(JSON.stringify({ message: 'User does not have permissions' }));
		return;
	}

	next(req, res);
};

export const loginAuth = async (
	req: IncomingMessage,
	res: ServerResponse,
	next: Middelware
) => {
	const decryptedUser = await getAuthenticatedUser(req, res);
	if (!decryptedUser) {
		res.setHeader('Content-Type', 'text/html');
		res.statusCode = 401;
		res.end('<h1>User is not logged in</h1>');
		return;
	}
	next(req, res);
};
