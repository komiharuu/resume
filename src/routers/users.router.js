import express from 'express';
import { prisma } from './index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import accessMiddleware from '../middleware/require-access-token.middleware.js';

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
    const accessToken = jwt.sign(
      {
        userId: user.userId,
      },
      'custom-secret-key',
      { expiresIn: '12h' }
    );

    // AccessToken 반환 및  authotization 헤더에 Bearer 토큰 형식으로 JWT를 저장합니다.
    res.header( 'authorization', `Bearer ${accessToken}`); 
    return res.status(200).json(`Bearer ${accessToken}`);
  } catch (err) {
    next(err);
  }
});


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
      userInfo: {
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