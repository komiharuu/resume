import express from 'express';
import { prisma } from './index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import refreshMiddleware from '../middleware/refresh-token.middleware.js';
import accessMiddleware from '../middleware/require-access-token.middleware.js';
import EnvConstants from '../constants/env.constant.js';
const router = express.Router();


/** 사용자 회원가입 API **/
router.post('/sign-up', async (req, res, next) => {
  
    const { email, password,  passwordConfirm, name, role } = req.body;
  const isExistUser = await prisma.users.findFirst({
    where: {
      email,
    },
  });

  if (!email) {
    return res.status(400).json({ message: '이메일을 입력해 주세요.' });
  }
  if (!password) {
    return res.status(400).json({ message: '비밀번호를 입력해 주세요.' });
  }
  if (!passwordConfirm) {
    return res.status(400).json({ message: '비밀번호 확인을 입력해 주세요.' });
  }
  if (!name) {
    return res.status(400).json({ message: '이름을 입력해 주세요.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: '이메일 형식이 올바르지 않습니다.' });
    }


  if (isExistUser) {
    return res.status(400).json({ message: '이미 가입 된 사용자입니다.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: '비밀번호는 6자리 이상이어야 합니다.' });
  }


  if (password !== passwordConfirm) {
    return res.status(400).json({ message: '입력 한 두 비밀번호가 일치하지 않습니다.' });
  }


  // 사용자 비밀번호를 암호화합니다.
  const hashedPassword = await bcrypt.hash(password, 10);


  // Users 테이블에 사용자를 추가합니다.
  try {const user = await prisma.users.create({
    data: { email,  name, role, password: hashedPassword, passwordConfirm}
        
    });
  
  // UserInfos 테이블에 사용자 정보를 추가합니다.

  const userInfo = await prisma.userInfos.create({
    data: {
      userId: user.userId, // 생성한 유저의 userId를 바탕으로 사용자 정보를 생성합니다.
      name,
      email,
      role,
      
    },
  });


  return res.status(201).json({ message: '회원가입이 완료되었습니다.', userInfo});
  } catch (err){
    next(err);
  } 
});


// 사용자 로그인 API
router.post('/sign-in', async (req, res, next) => {
    const { email, password } = req.body;
  
    try {
      // 유효성 검증
      if (!email) {
        return res.status(400).json({ message: '이메일을 입력해 주세요.' });
      }
      if (!password) {
        return res.status(400).json({ message: '비밀번호를 입력해 주세요.' });
      }
  
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: '이메일 형식이 올바르지 않습니다.' });
      }
  
      // 이메일로 사용자 조회
      const user = await prisma.users.findFirst({ where: { email } });
  
      // 이메일 또는 비밀번호가 일치하지 않는 경우
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: '인증 정보가 유효하지 않습니다.' });
      }
  
      // JWT 토큰 생성

      const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
      const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;



      const accessToken = jwt.sign(
        {
          userId: user.userId,
        },
      accessTokenSecret,
        { expiresIn: '12h' }
      );
      const refreshToken = jwt.sign(
        {
          userId: user.userId,
        },
        refreshTokenSecret,
        { expiresIn: '7d' }
      );
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.userId,
          expiresAt
        }
      })

      return res.status(200).json({accessToken,  refreshToken});
    } catch (err) {
      next(err);
    }
  });

// 토큰 재발급 API


const ACCESS_TOKEN_SECRET_KEY = EnvConstants.ACCESS_TOKEN_SECRET_KEY;
const REFRESH_TOKEN_SECRET_KEY = EnvConstants.REFRESH_TOKEN_SECRET_KEY;


router.post('/tokens', refreshMiddleware, async (req, res) => {
  const user = req.user;

  console.log(req.user)

  if (!user) {
    return res.status(401).json({ message: '인증 정보가 유효하지 않습니다.' });
  }

  const accessToken = createAccessToken(user.userId);
  const refreshToken = createRefreshToken(user.userId);

  
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  try {
    await prisma.refreshToken.upsert({
      where: { userId: user.userId },
      update: { token: refreshToken, expiresAt },
      create: { userId: user.userId, token: refreshToken, expiresAt },
    });

    res.header('accessToken', accessToken); 
    res.header('refreshToken', refreshToken); 

    return res.status(200).json({ accessToken,  refreshToken });
  } catch (err) {
    return res.status(500).json({ message: '토큰 발급에 실패했습니다.', error: err.message });
  }
});

function createAccessToken(userId) {
  return jwt.sign(
    { userId }, 
    ACCESS_TOKEN_SECRET_KEY, 
    { expiresIn: '12h' }
  );
}

function createRefreshToken(userId) {
  return jwt.sign(
    { userId }, 
    REFRESH_TOKEN_SECRET_KEY, 
    { expiresIn: '7d' }
  );
}


// 로그아웃

router.post('/logout', accessMiddleware, async (req, res) => {
  try {
    const user = req.user;

    // RefreshToken 삭제
    await prisma.refreshToken.deleteMany({
      where: {
        userId: user.userId
      }
    });

    return res.status(200).json({ userId: user.userId });
  } catch (error) {
    return res.status(500).json({ message: '로그아웃에 실패했습니다.', error: error.message });
  }
});



export default router;