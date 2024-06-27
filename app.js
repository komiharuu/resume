import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import ErrorHandlingMiddleware from './src/middleware/error-handler.middleware.js';
import apiRouter from './src/routers/index.js';
import { requireRolesMiddleware } from './src/middleware/require-roles.middleware.js';
dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.use(express.json());
app.use(cookieParser());
app.use('/api', apiRouter);
app.use(ErrorHandlingMiddleware);
app.use(requireRolesMiddleware);

app.listen(PORT, () => {
  console.log(PORT, '포트로 서버가 열렸어요!');
});
