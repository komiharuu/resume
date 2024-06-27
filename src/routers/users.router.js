import express from 'express';
import { prisma } from '../utils/prisma.util.js';
import accessMiddleware from '../middleware/require-access-token.middleware.js';

const userRouter = express.Router();

// 사용자 조회 API
userRouter.get('/users', accessMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.user;

    const user = await prisma.user.findFirst({
      where: { userId: +userId },
      select: {
        userId: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({ data: user });
  } catch (err) {
    next(err);
  }
});

export default userRouter;
