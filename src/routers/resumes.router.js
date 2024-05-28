
import express from 'express';
import { prisma } from './index.js';
import accessMiddleware from '../middleware/require-access-token.middleware.js';
import UserRole from '../constants/user.constant.js';



const router = express.Router();

/** 이력서 생성 API **/
router.post('/post', accessMiddleware, async (req, res, next) => {
  const { userId } = req.user;
  const { title, introduce} = req.body;

 try { if (!title) {
    return res.status(400).json({ message: '제목을 입력해 주세요.' });
  }
  if (!introduce) {
    return res.status(400).json({ message: '자기소개를 입력해 주세요.' });
  }

  if (introduce.length < 150) {
    return res.status(400).json({ message: '자기소개는 150자 이상 작성해야 합니다' });
  }


  const resume = await prisma.resumes.create({
    data: { 
      userId: +userId,
      title,
      introduce,
    },
  });




  return res.status(201).json({ data: resume });
} 
catch (err) {
  next(err);
}
});


// src/routes/posts.router.js

/** 이력서 목록 조회 API **/
router.get('/resumes', accessMiddleware, async (req, res, next) => {
  try {
    const userRole = req.user.role;
    const { status, sort = 'desc' } = req.query;
    const sortOrder = sort.toLowerCase() === 'asc' ? 'asc' : 'desc'; // 기본값은 'desc'

    // 조건에 따른 where 객체 생성
    let where = {};


    if (userRole !== UserRole.RECRUITER) {
      where.userId = req.user.userId;
    }

    if (status) {
      where.status = status.toUpperCase();
    }

  

    // Prisma 쿼리 실행
    const resumes = await prisma.resumes.findMany({
      where,
      orderBy: { createdAt: sortOrder },
      select: {
        resumeId: true,
        title: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { name: true } }
      }
    });

    // 결과 반환
    if (!resumes) {
      return res.status(200).json([]);
    }

    res.status(200).json({ data: resumes });
  } catch (err) {
    next(err);
  }
});








/** 이력서 상세 조회 API **/
router.get('/resumes/:resumeId', accessMiddleware, async (req, res, next) => {
  const { resumeId } = req.params;
  const userId = req.user.userId; // 현재 로그인한 사용자의 ID
  const userRole = req.user.role; // 현재 사용자의 역할

  try {
  
    let resume;

    // 채용 담당자인 경우 모든 이력서 조회 가능
    if (userRole === UserRole.RECRUITER) {
      resume = await prisma.resumes.findUnique({
        where: { resumeId: +resumeId },
        include: { user: { select: { name: true } } }
      });
    } else {
      resume = await prisma.resumes.findUnique({
        where: { 
          resumeId: +resumeId,
          userId: userId // 작성자 ID와 현재 로그인한 사용자의 ID가 모두 일치해야 함
        },
        include: { user: { select: { name: true } } }
      });
    }

    console.log('Resume:', resume);

    if (!resume) {
      return res.status(400).json({ message: '이력서가 존재하지 않습니다.' });
    }

    const Resume = {
      resumeId: resume.resumeId,
      name: resume.user.name, // 작성자 이름
      title: resume.title,
      introduce: resume.introduce,
      status: resume.status,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt
    };

    return res.status(200).json({ Resume });
  } catch (error) {
    next(error);
  }
});










/** 이력서 수정 API **/
router.patch('/resumes/:resumeId', accessMiddleware, async (req, res, next) => {
  const { resumeId} = req.params;
  const { title, introduce} = req.body;

  try {const post = await prisma.resumes.findUnique({
    where: { resumeId: +resumeId }, 
    include: {user: { select: { name: true } } } 
  });


  if (!post)  {
    return res.status(400).json({ message: '이력서가 존재하지 않습니다.'});
  }
  if (!title && !introduce)  {
    return res.status(400).json({ message: '수정 할 정보를 입력해 주세요.'});
  }
 
  const newResume = await prisma.resumes.update({
    where: { resumeId: +resumeId }, // 이력서 ID로 업데이트
    data: { title, introduce } // 수정할 정보
});

const Resume = {
  resumeId: newResume.resumeId,
  userId: newResume.userId,
  title: newResume.title,
  introduce: newResume.introduce,
  status: newResume.status,
  createdAt: newResume.createdAt,
  updatedAt: newResume.updatedAt
};

  return res.status(200).json({Resume });
} catch (error) {
  next(error);
}});



/** 게시글 삭제 API **/
router.delete('/resumes/:resumeId', accessMiddleware, async (req, res, next) => {
  const { resumeId } = req.params;
  

  const resume = await prisma.resumes.findFirst({ where: { resumeId: +resumeId} });

  if (!resume)
    return res.status(404).json({ message: '이력서가 존재하지 않습니다.' });


  await prisma.resumes.delete({ where: { resumeId: +resumeId} });

  return res.status(200).json({ resumeId: +resumeId});
});





















export default router;