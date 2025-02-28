// DB INTERACTION
import fs from 'fs/promises';
import path from 'path';
import url from 'url';
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const getData = async (fileName) => {
    const filePath = path.join(__dirname, '../', 'db', `${fileName}`);
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    }
    catch (error) {
        console.error(`Error reading file ${fileName}`);
        throw new Error(`Failed to read data from ${fileName}`);
    }
};
export const sendData = async (fileName, dataToSend) => {
    const filePath = path.join(__dirname, '../', 'db', fileName);
    try {
        await fs.writeFile(filePath, JSON.stringify(dataToSend));
        return;
    }
    catch (error) {
        console.error(`Error writing to ${fileName}`);
        throw new Error(`Failed to write data to ${fileName}`);
    }
};
