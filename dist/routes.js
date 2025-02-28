import { setHeader, adminAuth, authCurrentUser, loginAuth, } from './middlewares.js';
import { deleteData, errorHandler, findSingleItem } from './utils.js';
import { addNewCar, buyCar, editCurrentUser, editUsers, findSingleUser, getCars, getProfile, getUsers, hack, sse, } from './controllers.js';
import { login, logout, register } from './auth.js';
export const handleRoutes = (req, res) => {
    setHeader(req, res, async (req, res) => {
        var _a, _b, _c, _d, _e, _f;
        const id = (_a = req.url) === null || _a === void 0 ? void 0 : _a.split('/').pop();
        if (req.url === '/users') {
            if (req.method === 'GET')
                return loginAuth(req, res, (req, res) => adminAuth(req, res, getUsers));
            return errorHandler(req, res, 405, 'Method not allowed');
        }
        if ((_b = req.url) === null || _b === void 0 ? void 0 : _b.match(/^\/users\/\d+$/)) {
            if (req.method === 'GET') {
                return authCurrentUser(req, res, id, (req, res) => findSingleUser(req, res, id));
            }
            if (req.method === 'DELETE') {
                return adminAuth(req, res, (req, res) => deleteData(req, res, 'users.json', 'User not found', id));
            }
            return errorHandler(req, res, 405, 'Method not allowed');
        }
        if (req.url === '/cars') {
            if (req.method === 'GET')
                return loginAuth(req, res, getCars);
            if (req.method === 'POST')
                return loginAuth(req, res, addNewCar);
            return errorHandler(req, res, 405, 'Method not allowed');
        }
        if ((_c = req.url) === null || _c === void 0 ? void 0 : _c.match(/^\/cars\/\d+$/)) {
            if (req.method === 'GET') {
                return loginAuth(req, res, (req, res) => findSingleItem(req, res, 'cars.json', id));
            }
            if (req.method === 'DELETE') {
                return adminAuth(req, res, (req, res) => deleteData(req, res, 'cars.json', 'Car not found', id));
            }
            return errorHandler(req, res, 405, 'Method not allowed');
        }
        if (req.url === '/profile') {
            if (req.method === 'GET')
                return getProfile(req, res);
            return errorHandler(req, res, 405, 'Method not allowed');
        }
        if (req.url === '/register') {
            if (req.method === 'POST')
                return register(req, res);
            return errorHandler(req, res, 405, 'Method not allowed');
        }
        if (req.url === '/login') {
            if (req.method === 'POST')
                return login(req, res);
            return errorHandler(req, res, 405, 'Method not allowed');
        }
        if (req.url === '/logout') {
            if (req.method === 'GET')
                return logout(req, res);
            return errorHandler(req, res, 405, 'Method not allowed');
        }
        if (req.url === '/sse') {
            if (req.method === 'GET')
                return sse(req, res);
            return errorHandler(req, res, 405, 'Method not allowed');
        }
        if (req.url === '/users/edit') {
            if (req.method === 'PUT')
                return loginAuth(req, res, editCurrentUser);
            return errorHandler(req, res, 405, 'Method not allowed');
        }
        if ((_d = req.url) === null || _d === void 0 ? void 0 : _d.match(/\/user\/edit\/(user|admin)\d+/)) {
            //ok
            if (req.method === 'PUT') {
                return authCurrentUser(req, res, id, (req, res) => editUsers(req, res, id));
            }
            return errorHandler(req, res, 405, 'Method not allowed');
        }
        if ((_e = req.url) === null || _e === void 0 ? void 0 : _e.match(/\/cars\/(car\d+)\/buy$/)) {
            if (req.method === 'PUT')
                return buyCar(req, res);
            return errorHandler(req, res, 405, 'Method not allowed');
        }
        if ((_f = req.url) === null || _f === void 0 ? void 0 : _f.match(/^\/fund\/\d+$/)) {
            if (req.method === 'GET')
                return hack(req, res);
            return errorHandler(req, res, 405, 'Method not allowed');
        }
        res.setHeader('Content-Type', 'text/html');
        res.statusCode = 404;
        res.end('<h1>Page not found</h1>');
    });
};
