import { transferData, errorHandler, findByIndex } from './utils.js';
import { getData, sendData } from './data.js';
import { getUserFromToken, parseCookies, refreshToken } from './auth.js';
export let sseClients = [];
export const getUsers = async (req, res) => {
    try {
        const usersData = await getData('users.json');
        res.statusCode = 200;
        res.end(JSON.stringify(usersData));
    }
    catch (error) {
        errorHandler(req, res, 500, 'Internal server error');
    }
};
export const getCars = async (req, res) => {
    try {
        const carsData = await getData('cars.json');
        res.statusCode = 200;
        res.end(JSON.stringify(carsData));
    }
    catch (error) {
        errorHandler(req, res, 500, 'Internal server error');
    }
};
export const getProfile = async (req, res) => {
    const cookie = parseCookies(req);
    const decryptedUserId = getUserFromToken(cookie.token);
    try {
        const allUsers = await getData('users.json');
        const { item, index: currentUserIndex } = await findByIndex(allUsers, decryptedUserId);
        if (currentUserIndex === -1) {
            res.statusCode = 401;
            res.end(JSON.stringify({ message: 'User is not logged in' }));
            return;
        }
        const currentUser = {
            username: item.username,
            role: item.role,
            balance: item.balance,
        };
        refreshToken(req, res);
        res.statusCode = 200;
        res.end(JSON.stringify(currentUser));
    }
    catch (error) {
        errorHandler(req, res, 500, 'Internal server error');
    }
};
export const findSingleUser = async (req, res, id) => {
    try {
        const allUsers = await getData('users.json');
        const formattedId = id === null || id === void 0 ? void 0 : id.padStart(3, '0');
        const user = allUsers.find((user) => user.id.slice(-3) === formattedId);
        if (!user) {
            errorHandler(req, res, 404, 'User not found');
            return;
        }
        res.statusCode = 200;
        res.end(JSON.stringify(user));
    }
    catch (error) {
        errorHandler(req, res, 500, 'Internal server error');
    }
};
export const addNewCar = async (req, res) => {
    let body = '';
    req.on('data', (chunk) => {
        body += chunk.toString();
    });
    req.on('end', async () => {
        try {
            const allCars = await getData('cars.json');
            const newCarData = JSON.parse(body);
            if (!newCarData.model || !newCarData.price) {
                errorHandler(req, res, 400, 'Model and price are required');
                return;
            }
            const isCarExist = allCars.findIndex((car) => car.model === newCarData.model);
            if (isCarExist !== -1) {
                errorHandler(req, res, 409, 'Car already exists');
                return;
            }
            const newCar = {
                id: `car${(allCars.length + 1).toString().padStart(3, '0')}`,
                ...newCarData,
                ownerId: '',
            };
            allCars.push(newCar);
            await sendData('cars.json', allCars);
            res.statusCode = 201;
            res.end(JSON.stringify({ message: 'Added new car' }));
        }
        catch (error) {
            errorHandler(req, res, 500, 'Internal server error');
        }
    });
};
export const editCurrentUser = (req, res) => {
    let body = '';
    req.on('data', (chunk) => {
        body += chunk.toString();
    });
    req.on('end', async () => {
        try {
            const editedUserData = JSON.parse(body);
            const cookie = parseCookies(req);
            const decryptedUserId = getUserFromToken(cookie.token);
            const allUsers = await getData('users.json');
            const { item: userToEdit, index: isUserIndex } = await findByIndex(allUsers, decryptedUserId);
            if (isUserIndex === -1) {
                errorHandler(req, res, 404, 'User not found');
                return;
            }
            allUsers[isUserIndex] = {
                ...userToEdit,
                ...editedUserData,
            };
            await sendData('users.json', allUsers);
            res.statusCode = 200;
            res.end(JSON.stringify(allUsers[isUserIndex]));
        }
        catch (error) {
            errorHandler(req, res, 500, 'Internal server error');
        }
    });
};
export const editUsers = async (req, res, id) => {
    let body = '';
    req.on('data', (chunk) => {
        body += chunk.toString();
    });
    req.on('end', async () => {
        try {
            const allUsers = await getData('users.json');
            const editedUser = JSON.parse(body);
            const isUserIndex = allUsers.findIndex((user) => user.id === id);
            if (isUserIndex === -1) {
                errorHandler(req, res, 404, 'User not found');
                return;
            }
            allUsers[isUserIndex] = {
                ...editedUser,
                balance: Number(editedUser.balance),
                id: editedUser.role === 'admin'
                    ? 'admin' + (id === null || id === void 0 ? void 0 : id.slice(-3))
                    : 'user' + (id === null || id === void 0 ? void 0 : id.slice(-3)),
            };
            await sendData('users.json', allUsers);
            res.statusCode = 200;
            res.end(JSON.stringify('edited'));
        }
        catch (error) {
            errorHandler(req, res, 500, 'Internal server error');
        }
    });
};
export const buyCar = async (req, res) => {
    let body = '';
    req.on('data', (chunk) => {
        body += chunk.toString();
    });
    req.on('end', async () => {
        try {
            const bougthCar = JSON.parse(body);
            if (!bougthCar.username || !bougthCar.carId) {
                errorHandler(req, res, 400, 'Username and carId are required');
                return;
            }
            const allCars = await getData('cars.json');
            const allUsers = await getData('users.json');
            const findOwnerIndex = allUsers.findIndex((user) => user.username === bougthCar.username);
            const isCarIndex = allCars.findIndex((car) => {
                return car.id === bougthCar.carId;
            });
            if (isCarIndex === -1) {
                errorHandler(req, res, 404, 'Car not found');
                return;
            }
            if (allUsers[findOwnerIndex].balance < allCars[isCarIndex].price) {
                errorHandler(req, res, 403, 'The car is too expensive');
                return;
            }
            allUsers[findOwnerIndex] = {
                ...allUsers[findOwnerIndex],
                balance: allUsers[findOwnerIndex].balance - allCars[isCarIndex].price,
            };
            allCars[isCarIndex] = {
                ...allCars[isCarIndex],
                ownerId: allUsers[findOwnerIndex].id,
            };
            transferData(allCars[isCarIndex].id, allCars[isCarIndex].ownerId, sseClients);
            await sendData('cars.json', allCars);
            await sendData('users.json', allUsers);
            res.statusCode = 200;
            res.end(JSON.stringify(allCars[isCarIndex]));
        }
        catch (error) {
            errorHandler(req, res, 500, 'Internal server error');
        }
    });
};
export const hack = async (req, res) => {
    var _a;
    const bonus = Number((_a = req.url) === null || _a === void 0 ? void 0 : _a.split('/').pop());
    const cookie = parseCookies(req);
    const decryptedUserId = getUserFromToken(cookie.token);
    try {
        const allUsers = await getData('users.json');
        const isUserIndex = allUsers.findIndex((user) => {
            return user.id == decryptedUserId;
        });
        if (isUserIndex === -1) {
            errorHandler(req, res, 404, 'User not found');
            return;
        }
        allUsers[isUserIndex] = {
            ...allUsers[isUserIndex],
            balance: allUsers[isUserIndex].balance + bonus,
        };
        await sendData('users.json', allUsers);
        res.setHeader('Content-Type', 'text/html');
        res.statusCode = 200;
        res.end('<h1>Hacked!</h1><p>Your balance has been updated.</p>');
    }
    catch (error) {
        errorHandler(req, res, 500, 'Internal server error');
    }
};
export const sse = (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });
    sseClients.push(res);
    req.on('close', () => {
        sseClients = sseClients.filter((client) => client !== res);
    });
};
