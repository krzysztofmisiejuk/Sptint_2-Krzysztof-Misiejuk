import { IncomingMessage, ServerResponse } from 'http';
import {
	setHeader,
	adminAuth,
	authCurrentUser,
	loginAuth,
} from './middlewares.js';
import { deleteData, errorHandler, findSingleItem } from './utils.js';
import {
	addNewCar,
	buyCar,
	editCurrentUser,
	editUsers,
	findSingleUser,
	getCars,
	getProfile,
	getUsers,
	hack,
	sse,
} from './controllers.js';
import { login, logout, register } from './auth.js';

export const handleRoutes = (req: IncomingMessage, res: ServerResponse) => {
	setHeader(req, res, async (req, res) => {
		const id = req.url?.split('/').pop();

		if (req.url === '/users') {
			if (req.method === 'GET')
				return loginAuth(req, res, (req, res) => adminAuth(req, res, getUsers));
			return errorHandler(req, res, 405, 'Method not allowed');
		}

		if (req.url?.match(/^\/users\/\d+$/)) {
			if (req.method === 'GET') {
				return authCurrentUser(req, res, id, (req, res) =>
					findSingleUser(req, res, id)
				);
			}
			if (req.method === 'DELETE') {
				return adminAuth(req, res, (req, res) =>
					deleteData(req, res, 'users.json', 'User not found', id)
				);
			}
			return errorHandler(req, res, 405, 'Method not allowed');
		}

		if (req.url === '/cars') {
			if (req.method === 'GET') return loginAuth(req, res, getCars);
			if (req.method === 'POST') return loginAuth(req, res, addNewCar);
			return errorHandler(req, res, 405, 'Method not allowed');
		}

		if (req.url?.match(/^\/cars\/\d+$/)) {
			if (req.method === 'GET') {
				return loginAuth(req, res, (req, res) =>
					findSingleItem(req, res, 'cars.json', id)
				);
			}
			if (req.method === 'DELETE') {
				return adminAuth(req, res, (req, res) =>
					deleteData(req, res, 'cars.json', 'Car not found', id)
				);
			}
			return errorHandler(req, res, 405, 'Method not allowed');
		}

		if (req.url === '/profile') {
			if (req.method === 'GET') return getProfile(req, res);
			return errorHandler(req, res, 405, 'Method not allowed');
		}

		if (req.url === '/register') {
			if (req.method === 'POST') return register(req, res);
			return errorHandler(req, res, 405, 'Method not allowed');
		}

		if (req.url === '/login') {
			if (req.method === 'POST') return login(req, res);
			return errorHandler(req, res, 405, 'Method not allowed');
		}

		if (req.url === '/logout') {
			if (req.method === 'GET') return logout(req, res);
			return errorHandler(req, res, 405, 'Method not allowed');
		}

		if (req.url === '/sse') {
			if (req.method === 'GET') return sse(req, res);
			return errorHandler(req, res, 405, 'Method not allowed');
		}

		if (req.url === '/users/edit') {
			if (req.method === 'PUT') return loginAuth(req, res, editCurrentUser);
			return errorHandler(req, res, 405, 'Method not allowed');
		}

		if (req.url?.match(/\/user\/edit\/(user|admin)\d+/)) {
			if (req.method === 'PUT') {
				return authCurrentUser(req, res, id, (req, res) =>
					editUsers(req, res, id)
				);
			}
			return errorHandler(req, res, 405, 'Method not allowed');
		}

		if (req.url?.match(/\/cars\/(car\d+)\/buy$/)) {
			if (req.method === 'PUT') return buyCar(req, res);
			return errorHandler(req, res, 405, 'Method not allowed');
		}

		if (req.url?.match(/^\/fund\/\d+$/)) {
			if (req.method === 'GET') return hack(req, res);
			return errorHandler(req, res, 405, 'Method not allowed');
		}

		res.setHeader('Content-Type', 'text/html');
		res.statusCode = 404;
		res.end('<h1>Page not found</h1>');
	});
};
