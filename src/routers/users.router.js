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
      userInfos: {
        // 1:1 관계를 맺고있는 UserInfos 테이블을 조회합니다.
        select: {
          role: true,
        },
      },
    },
  });


  return res.status(200).json({ data: user});
}
   catch (err) {
    next(err);
  }
});









export default router;