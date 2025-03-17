import express from 'express';
import { pool } from '../db.js';
import { authCurrentUser, loginAuth, refreshToken } from '../middlewares.js';
import { BoughtCar, Car, User } from '../types.js';
import { sseClients, transferData } from './sse.js';
const router = express.Router();
router.use(refreshToken);

router.get('/', loginAuth, async (req, res) => {
	const { rows: cars } = await pool.query('SELECT * FROM cars');
	res.status(200).send(cars);
});

router.get('/:id', authCurrentUser, async (req, res) => {
	try {
		const id = req.params.id;
		const formattedId = `car${id.padStart(3, '0')}`;
		const { rows: car } = await pool.query('SELECT * FROM cars WHERE id = $1', [
			formattedId,
		]);
		if (car.length < 1) {
			res.status(404).send({ error: 'car not found' });
			return;
		}
		res.status(200).send(car);
	} catch (error) {
		res.status(500).send('Internal server error');
	}
});

router.post('/', async (req, res) => {
	try {
		const { rows: cars } = await pool.query('SELECT * FROM public.cars');
		const newCar = req.body;
		if (!newCar.model || !newCar.price) {
			return res.status(400).send({ error: 'Model and price are required' });
		}
		const isCarExist = cars.findIndex((car) => car.model === newCar.model);
		if (isCarExist !== -1) {
			return res.status(409).send({ error: 'Car already exists' });
		}

		await pool.query('INSERT INTO public.cars (model, price) VALUES($1, $2)', [
			newCar.model,
			newCar.price,
		]);
		res.status(201).send({ message: 'Added new car' });
	} catch (error) {
		res.status(500).send('Internal server error');
	}
});

router.put('/:id/buy', async (req, res) => {
	try {
		const bougthCar: BoughtCar = req.body;
		const { rows: u } = await pool.query('SELECT * FROM public.users');
		const { rows: c } = await pool.query('SELECT * FROM public.cars');

		const users: User[] = u;
		const cars: Car[] = c;

		if (!bougthCar.username || !bougthCar.carId) {
			return res.status(400).send({ error: 'Username and carId are required' });
		}

		const findOwnerIndex = users.findIndex(
			(user) => user.username === bougthCar.username
		);

		const isCarIndex = cars.findIndex((car) => {
			return car.id === bougthCar.carId;
		});

		if (isCarIndex === -1) {
			return res.status(404).send({ error: 'Car not found' });
		}

		if (users[+findOwnerIndex].balance < +cars[isCarIndex].price) {
			return res.status(404).send({ error: 'The car is too expensive' });
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
		res.status(200).send({ message: 'Purchase succesfully' });
	} catch (error) {
		res.status(404).send({ error: 'Internal Server error' });
	}
});

router.delete('/:id', async (req, res) => {
	try {
		const id = req.params.id;
		const formattedId = `car${id.padStart(3, '0')}`;
		const { rows: car } = await pool.query('DELETE FROM cars WHERE id = $1', [
			formattedId,
		]);
		if (car.length < 1) {
			return res.status(404).send({ error: 'Car not found' });
		}
	} catch (error) {
		res.status(500).send({ error: 'internal server error' });
	}
});

export default router;
