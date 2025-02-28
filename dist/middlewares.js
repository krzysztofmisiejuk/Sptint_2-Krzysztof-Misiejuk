import { getAuthenticatedUser } from './auth.js';
export const setHeader = (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next(req, res);
};
export const adminAuth = async (req, res, next) => {
    const user = await getAuthenticatedUser(req, res);
    if ((user === null || user === void 0 ? void 0 : user.role) !== 'admin') {
        res.statusCode = 403;
        res.end(JSON.stringify({ message: 'User does not have permissions' }));
        return;
    }
    next(req, res);
};
export const authCurrentUser = async (req, res, id, next) => {
    const decryptedUser = await getAuthenticatedUser(req, res);
    if (!decryptedUser)
        return;
    const formattedId = id === null || id === void 0 ? void 0 : id.padStart(3, '0');
    const userId = decryptedUser.id.slice(-3);
    if (formattedId !== userId && decryptedUser.role !== 'admin') {
        res.statusCode = 403;
        res.end(JSON.stringify({ message: 'User does not have permissions' }));
        return;
    }
    next(req, res);
};
export const loginAuth = async (req, res, next) => {
    const decryptedUser = await getAuthenticatedUser(req, res);
    if (!decryptedUser) {
        res.setHeader('Content-Type', 'text/html');
        res.statusCode = 401;
        res.end('<h1>User is not logged in</h1>');
        return;
    }
    next(req, res);
};
