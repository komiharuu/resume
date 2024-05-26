// src/routes/posts.router.js

import express from 'express';
import { prisma } from './index.js';
import accessMiddleware from '../middleware/require-access-token.middleware.js';
const router = express.Router();

/** 이력서 생성 API **/
router.post('/post', accessMiddleware, async (req, res, next) => {
  const { userId } = req.user;
  const { title, introduce} = req.body;

  if (!title) {
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
});


// src/routes/posts.router.js

/** 이력서 목록 조회 API **/
router.get('/resumes', accessMiddleware, async (req, res, next) => {
   
  try {
    // Query Parameters로부터 정렬 조건을 받습니다.
    const sort = req.query.sort ? req.query.sort.toLowerCase() : 'desc';
    
    // 정렬 조건에 따른 정렬 방향을 설정합니다.
    const sortOrder = sort === 'asc' ? 'asc' : 'desc';


  const resumes = await prisma.resumes.findMany({
    where: { userId: req.user.userId },
     // 현재 로그인한 사용자의 userId와 일치하는 이력서만 조회
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
  
  

  if (resumes.length === 0) {
    return res.status(200).json([]);
  }

  res.status(200).json({ data: resumes });
} 
catch (err) {
  next(err);
}});


/** 이력서 상세 조회 API **/
router.get('/posts/:resumeId', accessMiddleware, async (req, res, next) => {
  const { resumeId} = req.params;
  const resume = await prisma.resumes.findUnique({
      where: { resumeId: +resumeId }, 
      include: {user: { select: { name: true } } } 
  });

  if (!resume) {
    return res.status(400).json({ message: '이력서가 존재하지 않습니다.'});
  }

  if (resume.userId !== req.user.userId) {
    return res.status(400).json({ message: '로그인한 사용자가 아닙니다.' });
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


  return res.status(200).json({Resume});
});





/** 게시글 수정 API **/
router.put('/posts/:resumeId', accessMiddleware, async (req, res, next) => {
  const { resumeId} = req.params;
  const { title, introduce} = req.body;

  const post = await prisma.resumes.findUnique({
    where: { resumeId: +resumeId }, 
    include: {user: { select: { name: true } } } 
  });

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
});



/** 게시글 삭제 API **/
router.delete('/posts/:resumeId', accessMiddleware, async (req, res, next) => {
  const { resumeId } = req.params;
  

  const resume = await prisma.resumes.findFirst({ where: { resumeId: +resumeId} });

  if (!resume)
    return res.status(404).json({ message: '이력서가 존재하지 않습니다.' });


  await prisma.resumes.delete({ where: { resumeId: +resumeId} });

  return res.status(200).json({ resumeId: +resumeId});
});



export default router;