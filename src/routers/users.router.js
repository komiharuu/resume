import express from 'express';
import { prisma } from './index.js';
import accessMiddleware from '../middleware/require-access-token.middleware.js';

const router = express.Router();




// 사용자 조회 API
router.get('/users', accessMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.user;

    const user = await prisma.users.findFirst({
      where: { userId: +userId },
      select: {
        userId: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // UserInfos 테이블과 조인하여 role 정보를 가져옵니다.
    const userInfo = await prisma.userInfos.findFirst({
      where: { userId: +userId },
      select: { role: true },
    });

    // user 객체에 role 정보를 추가합니다.
    if (userInfo) {
      user.role = userInfo.role;
    }

    return res.status(200).json({ data: user });
  } catch (err) {
    next(err);
  }
});









export default router;