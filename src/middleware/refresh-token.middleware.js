import jwt from 'jsonwebtoken';
import { prisma } from '../routers/index.js';


const REFRESH_TOKEN_SECRET_KEY = process.env.REFRESH_TOKEN_SECRET_KEY;

export default async function (req, res, next) {
  try {
    const authorization = req.headers['authorization'];
    if (!authorization) {
      return res.status(401).json({ message: '인증 정보가 없습니다.' });
    }

    const [tokenType, refreshToken] = authorization.split(' ');
    if (tokenType !== 'Bearer') {
      return res.status(401).json({ message: '지원하지 않는 인증 방식입니다.' });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET_KEY);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: '인증 정보가 만료되었습니다.' });
      } else {
        return res.status(401).json({ message: '인증 정보가 유효하지 않습니다.' });
      }
    }
    const userId = decodedToken.userId;

    const user = await prisma.users.findUnique({
      where: { userId: +userId },
    });
    if (!user) {
      return res.status(401).json({ message: '인증 정보와 일치하는 사용자가 없습니다.' });
    }

    const storedRefreshToken = await prisma.refreshToken.findFirst({
      where: { userId: userId },
    });
    if (!storedRefreshToken || storedRefreshToken.token !== refreshToken) {
      return res.status(401).json({ message: '폐기 된 인증 정보입니다.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: error.message || '인증 정보가 유효하지 않습니다.' });
  }
}
