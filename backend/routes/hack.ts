import express, { Request, Response } from 'express';
import { pool } from '../db.js';
import { getUserFromToken } from '../auth.js';
import { loginAuth } from '../middlewares.js';

const router = express.Router();
router.get('/:amount', loginAuth, async (req: Request, res: Response) => {
	try {
		const token = req.cookies?.token;
		const decryptedUserId = getUserFromToken(token);
		const bonus = req.params.amount;

		if (bonus.length === 0) {
			return res.status(404).send('<h2>Page not found</h2>');
		}

		const { rows: user } = await pool.query(
			'SELECT * FROM users SET WHERE id = $1',
			[decryptedUserId]
		);
		const amount = +bonus + +user[0].balance;

		await pool.query('UPDATE users SET balance=$1 WHERE id = $2', [
			amount,
			user[0].id,
		]);

		res.status(200).send(`<h2>You hacked user balance: ${bonus}</h2>`);
	} catch (error) {
		res.status(500).send({ error: 'Internal server error' });
	}
});

export default router;
