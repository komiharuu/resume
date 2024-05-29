
import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import ErrorHandlingMiddleware from './src/middleware/error-handler.middleware.js';
import ResumeConstant from './src/constants/resume.constant.js';
import UsersRouter from './src/routers/users.router.js';
import ResumesRouter from './src/routers/resumes.router.js';
import AuthRouter from './src/routers/auth.router.js';
import accessMiddleware from './src/middleware/require-access-token.middleware.js';
import { prisma } from './src/routers/index.js';
import requireRolesMiddleware from './src/middleware/require-roles.middleware.js';
dotenv.config();

const app = express();
const PORT = process.env.PORT

app.use(express.json());
app.use(cookieParser());
app.use('/api', [UsersRouter, ResumesRouter, AuthRouter ]);
app.use(ErrorHandlingMiddleware);



app.listen(PORT, () => {
  console.log(PORT, '포트로 서버가 열렸어요!');
});