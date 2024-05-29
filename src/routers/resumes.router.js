
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



// 이력서 로그 조회

router.patch( '/resume/:resumeId/status',  accessMiddleware, requireRolesMiddleware,
  async (req, res, next) => {
    const { resumeId } = req.params;
    const { status, reason } = req.body;
    const recruiterId = req.user.userId;
    try {
        // 필수 입력 필드 검증
        if (!status) {
            return res.status(400).json({ message: '변경하고자 하는 지원 상태를 입력해 주세요.' });
        }
        if (!reason) {
            return res.status(400).json({ message: '지원 상태 변경 사유를 입력해 주세요.' });
        }
        // 유효한 지원 상태인지 확인
        if (!Object.values(ResumeConstant).includes(status)) {
            return res.status(400).json({ message: '유효하지 않은 지원 상태입니다.' });
        }
  
        // 이력서 조회
        const resume = await prisma.resumes.findUnique({ where: { resumeId: +resumeId  } });
        if (!resume) {
            return res.status(400).json({ message: '이력서가 존재하지 않습니다.' });
        }
  

        // Transaction 시작
        const newResume = await prisma.$transaction([
          // 이력서 정보 수정
          prisma.resumes.update({
              where: { resumeId: +resumeId },
              data: { status }
          }),
          // 이력서 로그 생성 (비동기로 실행)
          prisma.resumeLog.create({
              data: {
                  resumeId: +resumeId,
                  recruiterId,
                  status: resume.status,
                  newstatus: status, // 수정된 필드명
                  reason
              }
          })
      ]);

      // 반환 정보
      return res.status(200).json({ newResumeLog: newResume[1] });
  } catch (error) {
      next(error);
  }
});


router.get('/resume/:resumeId/status', accessMiddleware, requireRolesMiddleware, async (req, res, next) => {
  const { resumeId } = req.params;
  const userRole = req.user.role;

  try {
    let where = { resumeId: +resumeId }; // 이력서 ID에 해당하는 로그만 조회하기 위해 where 절을 수정합니다.

    // 채용 담당자인 경우에만 특정 이력서 로그를 조회합니다.
    // 채용 담당자와 지원자 모두에게 이력서 로그를 반환해야 합니다.
    const resumelogs = await prisma.resumeLog.findMany({
      where,
      orderBy: { updatedAt: 'desc' }, // 내림차순으로 정렬합니다.
      select: {
        resumeId: true,
        logId: true,
        status: true,
        newstatus: true,
        reason: true,
        updatedAt: true,
        user: { select: { name: true } }
      }
    });

    if (!resumelogs) { // 조회된 로그가 없는 경우 빈 배열을 반환합니다.
      return res.status(200).json([]);
    }

    return res.status(200).json({ resumelogs });
  } catch (error) {
    next(error);
  }
});














export default router;