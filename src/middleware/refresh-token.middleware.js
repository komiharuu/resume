import jwt from 'jsonwebtoken';
import { prisma } from '../routers/index.js';
import EnvConstants from '../constants/env.constant.js';

const REFRESH_TOKEN_SECRET_KEY = EnvConstants.REFRESH_TOKEN_SECRET_KEY;

export default async function (req, res, next) {
  try {
    console.log(req.headers)
    const authorization = req.headers['authorization'];
    console.log(authorization)
    if (!authorization) {
      return res.status(401).json({ message: '인증 정보가 없습니다.' });
    }

    const [tokenType, refreshToken] = authorization.split(' ');
    if (tokenType !== 'Bearer') {
      return res.status(401).json({ message: '지원하지 않는 인증 방식입니다.' });
    }

    // let decodedToken;
    // try {
      const decodedToken = jwt.verify(refreshToken, '1234');
    // } catch (err) {
    //   if (err.name === 'TokenExpiredError') {
    //     return res.status(401).json({ message: '인증 정보가 만료되었습니다.' });
    //   } 
    // }
    const userId = decodedToken.userId;

    const user = await prisma.users.findUnique({
      where: { userId: +userId },
    });
    console.log(user)
    if (!user) {
      return res.status(401).json({ message: '인증 정보와 일치하는 사용자가 없습니다.' });
    }

    const storedRefreshToken = await prisma.refreshToken.findFirst({
      where: { userId: userId },
    });
    console.log(storedRefreshToken)
    if (!storedRefreshToken ) {
      return res.status(401).json({ message: '폐기 된 인증 정보입니다.' });
    }

    req.user = user;
    next();
  } catch (error) {
   
    return res.status(401).json({ message: error.message || '인증 정보가 유효하지 않습니다.' });
  }
}
