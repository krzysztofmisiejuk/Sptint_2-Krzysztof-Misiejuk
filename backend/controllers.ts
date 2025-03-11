import { IncomingMessage, ServerResponse } from 'http';
import { transferData, errorHandler, findByIndex } from './utils.js';
import { getData, pool, sendData } from './data.js';
import { getUserFromToken, parseCookies, refreshToken } from './auth.js';
import {
	AddedCar,
	BoughtCar,
	Car,
	EditedCurrentUser,
	EditedUser,
	Profile,
	User,
} from './types.js';
export let sseClients: ServerResponse[] = [];

export const getUsers = async (
	req: IncomingMessage,
	res: ServerResponse
): Promise<void> => {
	try {
		const { rows: users } = await pool.query('SELECT * FROM public.users');
		res.statusCode = 200;
		res.end(JSON.stringify(users));
	} catch (error) {
		errorHandler(req, res, 500, 'Internal server error');
	}
};
export const getCars = async (
	req: IncomingMessage,
	res: ServerResponse
): Promise<void> => {
	try {
		const { rows: cars } = await pool.query('SELECT * FROM public.cars');
		res.statusCode = 200;
		res.end(JSON.stringify(cars));
	} catch (error) {
		errorHandler(req, res, 500, 'Internal server error');
	}
};

export const getProfile = async (
    req: IncomingMessage,
    res: ServerResponse
): Promise<void> => {
    const cookie = parseCookies(req);
    const decryptedUserId = getUserFromToken(cookie.token);
    if (!decryptedUserId) {
        errorHandler(req, res, 401, 'Unauthorized');
        return;
    }

    try {
        const { rows } = await pool.query(
            'SELECT * FROM public.users WHERE id = $1',
            [decryptedUserId]
        );
        const user: User = rows[0];
        if (!user) {
            errorHandler(req, res, 404, 'User not found');
            return;
        }
        const currentUser: Profile = {
            username: user.username,
            role: user.role,
            balance: user.balance,
        };
        const cookies = parseCookies(req);
        res.setHeader('Set-Cookie', [
            `token=${cookies.token}; Path=/; HttpOnly; Max-Age=3600; SameSite=Strict`,
        ]);
        res.statusCode = 200;
        res.end(JSON.stringify(currentUser));
    } catch (error) {
        errorHandler(req, res, 500, 'Internal server error');
    }
};

export const findSingleUser = async (
	req: IncomingMessage,
	res: ServerResponse,
	id?: string
): Promise<void> => {
	try {
		const formattedId = `user${id?.padStart(3, '0')}`;
		const { rows: user } = await pool.query(
			'SELECT * FROM public.users WHERE id = $1',
			[formattedId]
		);
		if (user.length < 1) {
			errorHandler(req, res, 404, 'User not found');
			return;
		}
		res.statusCode = 200;
		res.end(JSON.stringify(user));
	} catch (error) {
		errorHandler(req, res, 500, 'Internal server error');
	}
};

export const addNewCar = async (
	req: IncomingMessage,
	res: ServerResponse
): Promise<void> => {
	let body = '';
	req.on('data', (chunk) => {
		body += chunk.toString();
	});
	req.on('end', async () => {
		try {
			const { rows: cars } = await pool.query('SELECT * FROM public.cars');
			const newCarData: AddedCar = JSON.parse(body);
			console.log(newCarData);

			if (!newCarData.model || !newCarData.price) {
				errorHandler(req, res, 400, 'Model and price are required');
				return;
			}
			const isCarExist = cars.findIndex(
				(car) => car.model === newCarData.model
			);
			if (isCarExist !== -1) {
				errorHandler(req, res, 409, 'Car already exists');
				return;
			}
			await pool.query(
				'INSERT INTO public.cars (model, price) VALUES($1, $2)',
				[newCarData.model, newCarData.price]
			);
			res.statusCode = 201;
			res.end(JSON.stringify({ message: 'Added new car' }));
		} catch (error) {
			errorHandler(req, res, 500, 'Internal server error');
		}
	});
};

export const editCurrentUser = (req: IncomingMessage, res: ServerResponse) => {
	let body = '';
	req.on('data', (chunk) => {
		body += chunk.toString();
	});
	req.on('end', async () => {
		try {
			const cookie = parseCookies(req);
			const decryptedUserId = getUserFromToken(cookie.token);
			const editedData: EditedCurrentUser = JSON.parse(body);
			const { rows } = await pool.query('SELECT * FROM public.users');
			const allUsers: User[] = rows;

			const isUserExist = allUsers.findIndex((user) => {
				return user.id === decryptedUserId;
			});

			if (isUserExist === -1) {
				errorHandler(req, res, 404, 'User not found');
				return;
			}

			await pool.query(
				'UPDATE public.users SET username = $1, password = $2, role = $3 WHERE id = $4',
				[
					editedData.username,
					editedData.password,
					editedData.role,
					decryptedUserId,
				]
			);

			res.statusCode = 200;
			res.end(JSON.stringify({ message: 'Editing completed successfully' }));
		} catch (error) {
			errorHandler(req, res, 500, 'Internal server error');
		}
	});
};

export const editUsers = async (
	req: IncomingMessage,
	res: ServerResponse,
	id?: string
) => {
	let body = '';
	req.on('data', (chunk) => {
		body += chunk.toString();
	});
	req.on('end', async () => {
		try {
			const { rows: users } = await pool.query('SELECT * FROM public.users');
			const editedUser: EditedUser = JSON.parse(body);
			const isUserIndex = users.findIndex((user) => user.id === id);

			if (isUserIndex === -1) {
				errorHandler(req, res, 404, 'User not found');
				return;
			}

			await pool.query(
				'UPDATE public.users SET username = $1, password = $2, role = $3, balance = $4 WHERE id = $5',
				[
					editedUser.username,
					editedUser.password,
					editedUser.role,
					editedUser.balance,
					id,
				]
			);

			res.statusCode = 200;
			res.end(JSON.stringify({ message: 'Editing completed successfully' }));
		} catch (error) {
			errorHandler(req, res, 500, 'Internal server error');
		}
	});
};

export const buyCar = async (req: IncomingMessage, res: ServerResponse) => {
	let body = '';
	req.on('data', (chunk) => {
		body += chunk.toString();
	});
	req.on('end', async () => {
		try {
			const bougthCar: BoughtCar = JSON.parse(body);
			const { rows: u } = await pool.query('SELECT * FROM public.users');
			const { rows: c } = await pool.query('SELECT * FROM public.cars');

			console.log(bougthCar);
			const users: User[] = u;
			const cars: Car[] = c;

			if (!bougthCar.username || !bougthCar.carId) {
				errorHandler(req, res, 400, 'Username and carId are required');
				return;
			}

			const findOwnerIndex = users.findIndex(
				(user) => user.username === bougthCar.username
			);

			const isCarIndex = cars.findIndex((car) => {
				return car.id === bougthCar.carId;
			});

			if (isCarIndex === -1) {
				errorHandler(req, res, 404, 'Car not found');
				return;
			}

			if (users[+findOwnerIndex].balance < +cars[isCarIndex].price) {
				errorHandler(req, res, 403, 'The car is too expensive');
				return;
			}

			users[findOwnerIndex] = {
				...users[findOwnerIndex],
				balance: users[findOwnerIndex].balance - cars[isCarIndex].price,
			};

			cars[isCarIndex] = {
				...cars[isCarIndex],
				owner_id: users[findOwnerIndex].id,
			};
			transferData(cars[isCarIndex].id, cars[isCarIndex].owner_id, sseClients);
			await pool.query(
				'UPDATE public.users SET balance = $1 WHERE username = $2',
				[users[findOwnerIndex].balance, bougthCar.username]
			);
			await pool.query('UPDATE public.cars SET owner_Id = $1  WHERE id = $2', [
				cars[isCarIndex].owner_id,
				bougthCar.carId,
			]);
			res.statusCode = 200;
			res.end(JSON.stringify({ message: 'purchase succesfully' }));
		} catch (error) {
			errorHandler(req, res, 500, 'Internal server error');
		}
	});
};

export const hack = async (req: IncomingMessage, res: ServerResponse) => {
	const bonus = Number(req.url?.split('/').pop());
	const cookie = parseCookies(req);
	const decryptedUserId = getUserFromToken(cookie.token);

	try {
		const { rows } = await pool.query('SELECT * FROM public.users');
		const users: User[] = rows;
		const isUserIndex = users.findIndex((user) => {
			return user.id == decryptedUserId;
		});
		if (isUserIndex === -1) {
			errorHandler(req, res, 404, 'User not found');
			return;
		}

		const hackedBalance = +bonus + +users[isUserIndex].balance;

		console.log(hackedBalance);
		await pool.query('UPDATE public.users SET balance = $1 WHERE id = $2', [
			hackedBalance,
			decryptedUserId,
		]);

		res.setHeader('Content-Type', 'text/html');
		res.statusCode = 200;
		res.end('<h1>Hacked!</h1><p>Your balance has been updated.</p>');
	} catch (error) {
		errorHandler(req, res, 500, 'Internal server error');
	}
};

export const sse = (req: IncomingMessage, res: ServerResponse) => {
	res.writeHead(200, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		Connection: 'keep-alive',
	});
	sseClients.push(res);

	req.on('close', () => {
		sseClients = sseClients.filter((client) => client !== res);
		res.end();
	});
};
