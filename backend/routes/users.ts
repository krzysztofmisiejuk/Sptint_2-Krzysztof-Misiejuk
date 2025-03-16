import express from 'express';
import { pool } from '../db.js';
import { adminAuth, authCurrentUser, loginAuth, refreshToken } from '../middlewares.js';
import { getUserFromToken} from '../auth.js';
import { EditedCurrentUser, EditedUser, Profile, User } from '../types.js';
const router = express.Router();


router.use(refreshToken)

router.get('/', loginAuth, adminAuth, async (req, res) => {
	const { rows: users } = await pool.query('SELECT * FROM users');
	res.status(200).send(users);
});

router.get('/profile', async (req, res) => {
	try {
		const token = req.cookies?.token;
		const decryptedUserId = getUserFromToken(token);
		if (!decryptedUserId) {
			return res.status(401).send({ message: 'Unauthorized' });
		}
		const { rows } = await pool.query(
			'SELECT * FROM public.users WHERE id = $1',
			[decryptedUserId]
		);
		const user: User = rows[0];
		if (!user) {
			return res.status(404).send({ message: 'User not found' });
		}
		const currentUser: Profile = {
			username: user.username,
			role: user.role,
			balance: user.balance,
		}
		res.status(200).send(currentUser);
	} catch (error) {
		res.status(500).send('Internal server error');
	}
});

router.get('/:id', authCurrentUser, async (req, res) => {
	try {
		const id = req.params.id;
		const formattedId = `user${id.padStart(3, '0')}`;
		const { rows: user } = await pool.query(
			'SELECT * FROM users WHERE id = $1',
			[formattedId]
		);
		if (user.length < 1) {
			res.status(404).send({ error: 'User not found' });
			return;
		}
		res.status(200).send(user);
	} catch (error) {
		res.status(500).send('Internal server error');
	}
});

router.put('/edit', authCurrentUser, async (req, res) => {
	try {
		const token = req.cookies?.token;
		const decryptedUserId = getUserFromToken(token);
		const editedData: EditedCurrentUser = req.body;
		const { rows } = await pool.query('SELECT * FROM public.users');
		const users: User[] = rows;
		const isUserExist = users.findIndex((user) => {
			return user.id === decryptedUserId;
		});

		if (isUserExist === -1) {
			return res.status(404).send({ error: 'User not found' });
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

		res.status(200).send({ message: 'User edited succesfully' });
	} catch (error) {
		res.status(500).send('Internal server error');
	}
});

router.put('/edit/:id', authCurrentUser, async (req, res) => {
	try {
		const id = req.params.id;
		const editedUser: EditedUser = req.body;
		const { rows: users } = await pool.query('SELECT * FROM public.users');
		const isUserExist = users.findIndex((user) => user.id === id);

		if (isUserExist === -1) {
			return res.status(404).send({ error: 'User not found' });
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
		res.status(200).send({ message: 'User edited succesfully' });
	} catch (error) {
		res.status(500).send('Internal server error');
	}
});

router.delete('/:id', adminAuth, async (req, res) => {
	try {
		const id = req.params.id;
		const formattedId = `user${id.padStart(3, '0')}`;
		const { rows: user } = await pool.query('DELETE FROM users WHERE id = $1', [
			formattedId,
		]);
		if (user.length < 1) {
			return res.status(404).send({ error: 'User not found' });
		}
	} catch (error) {
		res.status(500).send({ error: 'Internal server error' });
	}
});

export default router;
