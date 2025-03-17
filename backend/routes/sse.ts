import express, { Response } from 'express';
import { SseMessage } from '../types.js';

const router = express.Router();

export let sseClients: Response[] = [];

export const transferData = (
	carId: string,
	ownerId: string,
	clients: Response[]
) => {
	const message: SseMessage = { event: 'purchase', carId, ownerId };
	const sseMessage = `data: ${JSON.stringify(message)}\n\n`;

	clients.forEach((client) => {
		try {
			client.write(sseMessage);
		} catch (error) {
			console.error('Błąd wysyłania SSE:', error);
			sseClients = sseClients.filter((c) => c !== client);
		}
	});
};

router.get('/', (req, res: Response) => {
	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Connection', 'keep-alive');
	sseClients.push(res);

	req.on('close', () => {
		sseClients = sseClients.filter((client) => client !== res);
		res.end();
	});
});

export default router;
