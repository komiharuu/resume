import express from 'express';
import { prisma } from '../utils/prisma.util.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import refreshMiddleware from '../middleware/refresh-token.middleware.js';
import { signUpValidator } from '../middleware/validatiors/auth-sign-up-validatior.js';
import { SignInValidator } from '../middleware/validatiors/auth-sign-in-validatior.js';
const authRouter = express.Router();

/** 사용자 회원가입 API **/

// provider, socialid- 두개만 추가
authRouter.post('/sign-up', signUpValidator, async (req, res, next) => {
  const { email, password, name } = req.body;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res
      .status(400)
      .json({ message: '이메일 형식이 올바르지 않습니다.' });
  }

  const isExistUser = await prisma.user.findFirst({
    where: {
      email,
    },
  });

  if (isExistUser) {
    return res.status(400).json({ message: '이미 가입 된 사용자입니다.' });
  }



  // 사용자 비밀번호를 암호화합니다.
  const hashedPassword = await bcrypt.hash(password, 10);

  // User 테이블에 사용자를 추가합니다.
  try {
    const userInfo = await prisma.user.create({
      data: { email, name, password: hashedPassword },
    });
    delete userInfo.password;

    return res
      .status(201)
      .json({ message: '회원가입이 완료되었습니다.', userInfo });
  } catch (err) {
    next(err);
  }
});

// 사용자 로그인 API
//이메일 비밀번호 위주
authRouter.post('/sign-in', SignInValidator, async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // 이메일로 사용자 조회
    const user = await prisma.user.findFirst({ where: { email } });

    // 이메일 또는 비밀번호가 일치하지 않는 경우
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res
        .status(401)
        .json({ message: '인증 정보가 유효하지 않습니다.' });
    }

    // JWT 토큰 생성

    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET_KEY;
    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET_KEY;

    const accessToken = jwt.sign(
      {
        userId: user.userId,
      },
      accessTokenSecret,
      { expiresIn: process.env.ACCESS_TOKEN_SECRET_KEY_TIME }
    );
    const refreshToken = jwt.sign(
      {
        userId: user.userId,
      },
      refreshTokenSecret,
      { expiresIn: process.env.REFRESH_TOKEN_SECRET_KEY_TIME }
    );

    await prisma.refreshToken.upsert({
      where: {
        userId: user.userId,
      },
      create: { userId: user.userId, token: refreshToken },
      update: { token: refreshToken },
    });

    return res.status(200).json({
      status: 200,
      message: '로그인에 성공하였습니다.',
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// 토큰 재발급 API- 1번밖에 발급못하니 upsert~
//유효한지만 확인하고 재발급

authRouter.post('/tokens', refreshMiddleware, async (req, res, next) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ message: '인증 정보가 유효하지 않습니다.' });
  }

  // 토큰 발급
  const accessToken = jwt.sign(
    {
      userId: user.userId,
    },
    process.env.ACCESS_TOKEN_SECRET_KEY,
    { expiresIn: process.env.ACCESS_TOKEN_SECRET_KEY_TIME }
  );
  const refreshToken = jwt.sign(
    {
      userId: user.userId,
    },
    process.env.REFRESH_TOKEN_SECRET_KEY,
    { expiresIn: process.env.REFRESH_TOKEN_SECRET_KEY_TIME }
  );

  try {
    await prisma.refreshToken.upsert({
      where: { userId: user.userId },
      update: {
        token: refreshToken,
        expiresAt: process.env.REFRESH_TOKEN_SECRET_KEY_TIME,
      },
      create: { userId: user.userId, token: refreshToken },
    });

    res.header('accessToken', accessToken);
    res.header('refreshToken', refreshToken);

    return res.status(200).json({ accessToken, refreshToken });
  } catch (err) {
    return res
      .status(500)
      .json({ message: '토큰 발급에 실패했습니다.', error: err.message });
  }
});

// 로그아웃

authRouter.post('/logout', refreshMiddleware, async (req, res) => {
  try {
    const user = req.user;

    // accessToken 삭제
    await prisma.refreshToken.update({
      where: {
        userId: user.userId,
      },
      data: {
        token: null,
      },
    });

    return res.status(200).json({ userId: user.userId });
  } catch (error) {
    return res
      .status(500)
      .json({ message: '로그아웃에 실패했습니다.', error: error.message });
  }
});

export default authRouter;
