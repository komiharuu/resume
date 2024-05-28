

import jwt from 'jsonwebtoken';
import { prisma } from '../routers/index.js';



// Exporting the middleware function
export default async function (req, res, next) {
  try {

    const authorization = req.headers['authorization'];

    if (!authorization) {
      throw new Error('인증 정보가 없습니다.');
    }

    const [tokenType, accessToken] = authorization.split(' ');

    if (tokenType !== 'Bearer') {
      throw new Error('지원하지 않는 인증 방식입니다');
    }

    const decodedToken = jwt.verify(accessToken, 'kumakuma0810');
    const userId = decodedToken.userId;

    const user = await prisma.users.findFirst({
      where: { userId: +userId },
    });

    if (!user) {
      throw new Error('인증 정보와 일치하는 사용자가 없습니다.');
    }

    
    req.user = user;
  

    next();
  } catch (error) {
    res.clearCookie('authorization');
    switch (error.name) {
      case 'TokenExpiredError':
        return res.status(401).json({ message: '인증 정보가 만료되었습니다' });
      case 'JsonWebTokenError':
        return res.status(401).json({ message: '토큰이 조작되었습니다.' });
      default:
        return res
          .status(401)
          .json({ message: error.message ?? '인증 정보가 유효하지 않습니다.' });
    }
  }
}