import express from 'express';
import authRouter from './auth.router.js';
import userRouter from './users.router.js';
import resumeRouter from './resumes.router.js';
const apiRouter = express.Router();

// 테스트용 라우터 (나중에 지울 예정)
apiRouter.get('/', (req, res) => {
  return res.status(200).json({ message: 'index.js 테스트' });
});

// 회원가입 라우터
apiRouter.use('/auth', authRouter);

//이력서 라우터
apiRouter.use('/resumes', resumeRouter);

// 사용자 정보 라우터
apiRouter.use('/user', userRouter);

export default apiRouter;
