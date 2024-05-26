
import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import ErrorHandlingMiddleware from './src/middleware/error-handler.middleware.js';
import UsersRouter from './src/routers/users.router.js';
import ResumesRouter from './src/routers/resumes.router.js';

dotenv.config();

const app = express();
const PORT = 3018;

app.use(express.json());
app.use(cookieParser());
app.use(ErrorHandlingMiddleware);
app.use('/api', [UsersRouter, ResumesRouter]);

app.listen(PORT, () => {
  console.log(PORT, '포트로 서버가 열렸어요!');
});