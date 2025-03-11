import { IncomingMessage, ServerResponse } from 'http';
import { getData, sendData } from './data.js';
import { Car, User } from './types.js';

export const errorHandler = (
	req: IncomingMessage,
	res: ServerResponse,
	statusCode: number,
	errorMsg: string
) => {
	res.statusCode = statusCode;
	res.end(JSON.stringify({ error: errorMsg }));
};

export const findByIndex = async <T>(
	data: T[],
	id: string | null | undefined
) => {
	const index = data.findIndex((item: any) => item?.id === id);
	return { item: data[index], index };
};

export const deleteData = async (
	req: IncomingMessage,
	res: ServerResponse,
	filePath: string,
	errorMessage: string,
	id?: string
) => {
	try {
		const allData: (User | Car)[] = await getData<User | Car>(filePath);
		const itemId = id?.padStart(3, '0');
		const findIndex = allData.findIndex(
			(item: any) => item.id.slice(-3) === itemId
		);

		if (findIndex === -1) {
			errorHandler(req, res, 404, errorMessage);
			return;
		}

		allData.splice(findIndex, 1);
		await sendData(filePath, allData);
		res.statusCode = 200;
		res.end(
			JSON.stringify({
				message: `successfully deleted ${
					filePath === 'users.json' ? 'user' + itemId : 'car' + itemId
				}`,
			})
		);
	} catch (error) {
		errorHandler(req, res, 500, 'Server error');
	}
};

export const findSingleItem = async (
	req: IncomingMessage,
	res: ServerResponse,
	filename: string,
	id?: string
) => {
	const allData: (User | Car)[] = await getData<User | Car>(filename);
	const itemId = id?.padStart(3, '0');
	const findData = allData.find((item) => item.id.slice(-3) === itemId);

	if (!findData) {
		errorHandler(req, res, 404, 'Data not found');
		return;
	}

	res.statusCode = 200;
	res.end(JSON.stringify(findData));
};

export function transferData(
	carId: string,
	buyerId: string,
	sseClients: ServerResponse[]
) {
	const message = { event: 'purchase', carId, buyerId };
	const sseMessage = `data: ${JSON.stringify(message)}\n\n`;

	sseClients.forEach((client) => {
		try {
			client.write(sseMessage);
		} catch (error) {
			console.error('Błąd wysyłania SSE:', error);
			sseClients = sseClients.filter((c) => c !== client);
		}
	});
}
