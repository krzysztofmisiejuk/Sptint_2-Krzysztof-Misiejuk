import { createServer } from 'http';
import 'dotenv/config';
import url from 'url';
import fs from 'fs/promises';
import path from 'path';
import { handleRoutes } from './routes.js';
import { errorHandler } from './utils.js';
const PORT = process.env.PORT || 3000;
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const server = createServer(async (req, res) => {
    var _a;
    try {
        if (req.url === '/' || req.url === '/static') {
            res.writeHead(302, { Location: '/static/index.html' });
            res.end();
            return;
        }
        if ((_a = req.url) === null || _a === void 0 ? void 0 : _a.startsWith('/static/')) {
            const filePath = req.url === '/'
                ? path.join(__dirname, '../frontend/index.html')
                : path.join(__dirname, '../frontend', req.url.replace('/static/', ''));
            const extension = path.extname(filePath).slice(1);
            let contentType = 'text/html';
            switch (extension) {
                case 'html':
                    contentType = 'text/html';
                    break;
                case 'css':
                    contentType = 'text/css';
                    break;
                case 'js':
                    contentType = 'text/javascript';
                    break;
            }
            try {
                const data = await fs.readFile(filePath);
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(data);
            }
            catch (err) {
                errorHandler(req, res, 404, 'File Not Found');
            }
            return;
        }
        handleRoutes(req, res);
    }
    catch (error) {
        errorHandler(req, res, 500, 'Internal server error');
    }
});
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
