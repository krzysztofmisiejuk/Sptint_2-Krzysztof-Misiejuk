import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import url from 'url';
import cookieParser from 'cookie-parser';
import authRouter from './auth.js';
import usersRouter from './routes/users.js';
import carsRouter from './routes/cars.js';
import hackRouter from './routes/hack.js';
import sseRouter from './routes/sse.js';

dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/', authRouter);
app.use('/users', usersRouter);
app.use('/cars', carsRouter);
app.use('/fund', hackRouter);
app.use('/sse', sseRouter);

app.use("/", (req, res)=>{
	res.status(404).send("<h1>Page not found</h1>")
})

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});