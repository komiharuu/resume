
import express from 'express';
import { prisma } from './index.js';
import accessMiddleware from '../middleware/require-access-token.middleware.js';
import UserRole from '../constants/user.constant.js';
import ResumeConstant from '../constants/resume.constant.js';


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
router.get('/resumes', accessMiddleware,  async (req, res, next) => {
   
  try {

    const userRole = req.user.role;

    // Query Parameters로부터 정렬 조건을 받습니다.
    const { status } = req.query;
    const sortOrder = req.query.sort ? req.query.sort.toLowerCase() : 'desc';
    

    let where = {};
    if (userRole == UserRole.RECRUITER) {
      where.userId = req.user.userId;
    }
    
    if (status) {
      where.status = ResumeConstant.toUpperCase();
    }
 
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
  const { resumeId } = req.params;
  const userRole = req.user.role;

  try {
    let resume;
    // 채용 담당자인 경우 이력서를 조회합니다.
    if (userRole === UserRole.RECRUITER) {
      resume = await prisma.resumes.findUnique({
        where: { resumeId: +resumeId },
        include: { user: { select: { name: true } } }
      });
    } else {
      // 지원자인 경우 이력서를 조회하고, 로그인한 사용자와 이력서 작성 사용자가 일치하는지 확인합니다.
      resume = await prisma.resumes.findUnique({
        where: { resumeId: +resumeId },
        include: { user: { select: { name: true } } }
      });
      
      if (!resume) {
        return res.status(400).json({ message: '이력서가 존재하지 않습니다.' });
      }

      if ( resume.userId !== req.user.userId) {
        return res.status(400).json({ message: '로그인한 사용자가 아닙니다.' });
      }
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
router.patch('/posts/:resumeId', accessMiddleware, async (req, res, next) => {
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