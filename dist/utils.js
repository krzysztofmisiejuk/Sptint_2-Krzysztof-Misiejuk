import { getData, sendData } from './data.js';
export const errorHandler = (req, res, statusCode, errorMsg) => {
    res.statusCode = statusCode;
    res.end(JSON.stringify({ error: errorMsg }));
};
export const findByIndex = async (data, id) => {
    const index = data.findIndex((item) => (item === null || item === void 0 ? void 0 : item.id) === id);
    return { item: data[index], index };
};
export const deleteData = async (req, res, filePath, errorMessage, id) => {
    try {
        const allData = await getData(filePath);
        const itemId = id === null || id === void 0 ? void 0 : id.padStart(3, '0');
        const findIndex = allData.findIndex((item) => item.id.slice(-3) === itemId);
        if (findIndex === -1) {
            errorHandler(req, res, 404, errorMessage);
            return;
        }
        allData.splice(findIndex, 1);
        await sendData(filePath, allData);
        res.statusCode = 200;
        res.end(JSON.stringify({
            message: `successfully deleted ${filePath === 'users.json' ? 'user' + itemId : 'car' + itemId}`,
        }));
    }
    catch (error) {
        errorHandler(req, res, 500, 'Server error');
    }
};
export const findSingleItem = async (req, res, filename, id) => {
    const allData = await getData(filename);
    const itemId = id === null || id === void 0 ? void 0 : id.padStart(3, '0');
    const findData = allData.find((item) => item.id.slice(-3) === itemId);
    if (!findData) {
        errorHandler(req, res, 404, 'Data not found');
        return;
    }
    res.statusCode = 200;
    res.end(JSON.stringify(findData));
};
export function transferData(carId, buyerId, sseClients) {
    const message = { event: 'purchase', carId, buyerId };
    const sseMessage = `data: ${JSON.stringify(message)}\n\n`;
    sseClients.forEach((client) => {
        try {
            client.write(sseMessage);
        }
        catch (error) {
            console.error('Błąd wysyłania SSE:', error);
            sseClients = sseClients.filter((c) => c !== client);
        }
    });
}
