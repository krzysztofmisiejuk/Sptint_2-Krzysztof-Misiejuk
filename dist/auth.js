import crypto from 'crypto';
import dotenv from 'dotenv';
import { pool } from './data.js';
import { errorHandler } from './utils.js';
dotenv.config();
const IV_LENGTH = 16;
const algorithm = 'aes-192-cbc';
const TOKEN_KEY = process.env.TOKEN_KEY;
if (!TOKEN_KEY)
    throw new Error('TOKEN_KEY is not set in .env');
const TOKEN_KEY_BUFFER = Buffer.from(TOKEN_KEY, 'utf8');
export function generateToken(userData) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(algorithm, TOKEN_KEY_BUFFER, iv);
    let encrypted = cipher.update(userData, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + '.' + encrypted;
}
export function getUserFromToken(token) {
    try {
        if (!token)
            return null;
        const parts = token.split('.');
        if (parts.length !== 2)
            return null;
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedData = parts[1];
        const decipher = crypto.createDecipheriv(algorithm, TOKEN_KEY_BUFFER, iv);
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        if (decrypted.startsWith('"') && decrypted.endsWith('"')) {
            decrypted = decrypted.slice(1, -1);
        }
        return decrypted.trim();
    }
    catch (error) {
        console.error('Decryption error:', error);
        return null;
    }
}
// export const getAuthenticatedUser = async (
// 	req: IncomingMessage,
// 	res: ServerResponse
// ): Promise<User | null> => {
// 	try {
// 		const cookie = parseCookies(req);
// 		const userId = getUserFromToken(cookie.token);
// 		const allUsers = await getData<User>('users.json');
// 		const user = allUsers.find((u) => u.id === userId);
// 		if (!user) {
// 			errorHandler(req, res, 404, 'You must be logged in');
// 			return null;
// 		}
// 		return user;
// 	} catch (error) {
// 		errorHandler(req, res, 500, 'Internal server error');
// 		return null;
// 	}
// };
export const getAuthenticatedUser = async (req, res) => {
    try {
        const cookie = parseCookies(req);
        const userId = getUserFromToken(cookie.token);
        if (!userId)
            return null;
        const { rows } = await pool.query('SELECT * FROM public.users WHERE id = $1', [userId]);
        return rows[0] || null;
    }
    catch (error) {
        console.error('Error in getAuthenticatedUser:', error);
        return null;
    }
};
export function parseCookies(req) {
    var _a;
    let list = {};
    const cookieHeader = (_a = req.headers) === null || _a === void 0 ? void 0 : _a.cookie;
    if (!cookieHeader)
        return list;
    cookieHeader.split(`;`).forEach(function (cookie) {
        let [name, ...rest] = cookie.split(`=`);
        name = name === null || name === void 0 ? void 0 : name.trim();
        if (!name)
            return;
        const value = rest.join(`=`).trim();
        if (!value)
            return;
        list[name] = decodeURIComponent(value);
    });
    return list;
}
// export const register = (req: IncomingMessage, res: ServerResponse): void => { 
// 	let body = '';
// 	req.on('data', (chunk) => {
// 		body += chunk.toString();
// 	});
// 	req.on('end', async () => {
// 		try {
// 			const allUsers = await getData<User>('users.json');
// 			const newUserData = JSON.parse(body);
// 			const isUserExist = allUsers.some(
// 				({ username }) => username === newUserData.username
// 			);
// 			if (isUserExist) {
// 				res.statusCode = 409;
// 				res.end(JSON.stringify({ message: 'User already exists' }));
// 				return;
// 			}
// 			const newUser: User = {
// 				id: `user${(allUsers.length + 1).toString().padStart(3, '0')}`,
// 				...newUserData,
// 				role: 'user',
// 				balance: 1000,
// 			};
// 			allUsers.push(newUser);
// 			await sendData('users.json', allUsers);
// 			res.statusCode = 201;
// 			res.end(JSON.stringify({ message: 'Added new user' }));
// 		} catch (error) {
// 			res.statusCode = 400;
// 			res.end(JSON.stringify({ error: 'Invalid data' }));
// 		}
// 	});
// };
export const register = (req, res) => {
    let body = '';
    req.on('data', (chunk) => {
        body += chunk.toString();
    });
    req.on('end', async () => {
        try {
            const newUserData = JSON.parse(body);
            // Sprawdzenie, czy użytkownik już istnieje w bazie danych
            const { rows: existingUsers } = await pool.query('SELECT * FROM public.users WHERE username = $1', [newUserData.username]);
            if (existingUsers.length > 0) {
                res.statusCode = 409;
                res.end(JSON.stringify({ message: 'User already exists' }));
                return;
            }
            // Wstawienie nowego użytkownika do bazy danych
            const { rows } = await pool.query('INSERT INTO public.users (username, password, role, balance) VALUES ($1, $2, $3, $4) RETURNING id', [newUserData.username, newUserData.password, 'user', 1000]);
            const newUserId = rows[0].id;
            const newUser = {
                id: `user${newUserId.toString().padStart(3, '0')}`,
                username: newUserData.username,
                password: newUserData.password,
                role: 'user',
                balance: 1000,
            };
            res.statusCode = 201;
            res.end(JSON.stringify({ message: 'Added new user', user: newUser }));
        }
        catch (error) {
            console.error('Registration error:', error);
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid data' }));
        }
    });
};
export const login = (req, res) => {
    let body = '';
    req.on('data', (chunk) => {
        body += chunk.toString();
    });
    req.on('end', async () => {
        try {
            const { rows } = await pool.query('SELECT * FROM public.users');
            const users = rows;
            const loginData = JSON.parse(body);
            const isUserExist = users.find(({ username, password }) => username === loginData.username && password === loginData.password);
            if (isUserExist) {
                const cookieData = generateToken(JSON.stringify(isUserExist.id));
                if (!cookieData) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: 'Error generating token' }));
                    return;
                }
                res.setHeader('Set-Cookie', `token=${cookieData}; Path=/; httpOnly; Max-Age=3600 SameSite=Strict` // jak zrobic refresh tokena ?
                );
                res.statusCode = 200;
                res.end(JSON.stringify(isUserExist));
                return;
            }
            else {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'Invalid data' }));
                return;
            }
        }
        catch (error) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid data' }));
        }
    });
};
export const logout = (req, res) => {
    const cookies = parseCookies(req);
    if (cookies && cookies.token) {
        delete cookies.token;
        res.setHeader('Set-Cookie', 'token=;  Max-Age=0');
        res.statusCode = 200;
        res.end(JSON.stringify({ message: 'Logged out' }));
    }
    else {
        res.statusCode = 400;
        res.end(JSON.stringify({ message: 'No session to log out from' }));
    }
};
export const refreshToken = async (req, res) => {
    const cookies = parseCookies(req);
    const token = cookies.token;
    if (!token) {
        errorHandler(req, res, 401, 'No token provided');
        return;
    }
    const userId = getUserFromToken(token);
    if (!userId) {
        errorHandler(req, res, 401, 'Invalid token');
        return;
    }
    try {
        const { rows } = await pool.query('SELECT * FROM public.users WHERE id = $1', [userId]);
        const user = rows[0];
        if (!user) {
            errorHandler(req, res, 404, 'User not found');
            return;
        }
        res.setHeader('Set-Cookie', [
            `token=${token}; Path=/; HttpOnly; Max-Age=3600; SameSite=Strict`,
        ]);
        // Kończymy odpowiedź, jeśli to samodzielny endpoint
        res.statusCode = 200;
        res.end(JSON.stringify({ message: 'Token refreshed' }));
    }
    catch (error) {
        errorHandler(req, res, 500, 'Internal server error');
    }
};
