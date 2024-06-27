import express from 'express';
import { prisma } from '../utils/prisma.util.js';
import accessMiddleware from '../middleware/require-access-token.middleware.js';
import UserRole from '../constants/user.constant.js';
import { requireRolesMiddleware } from '../middleware/require-roles.middleware.js';
import { ResumeValidator } from '../middleware/validatiors/resume-validatior.js';
import { resumeStatusValidator } from '../middleware/validatiors/resume-status-validatior.js';

const resumeRouter = express.Router();

/** 이력서 생성 API **/
resumeRouter.post(
  '/',
  accessMiddleware,
  ResumeValidator,
  async (req, res, next) => {
    const { userId } = req.user;
    const { title, introduce } = req.body;

    try {
      const resume = await prisma.resume.create({
        data: {
          userId: +userId,
          title,
          introduce,
        },
      });

      return res.status(201).json({ data: resume });
    } catch (err) {
      next(err);
    }
  }
);

// src/routes/posts.router.js

/** 이력서 목록 조회 API **/
resumeRouter.get('/', accessMiddleware, async (req, res, next) => {
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
    const resumes = await prisma.resume.findMany({
      where,
      orderBy: { createdAt: sortOrder },
      select: {
        resumeId: true,
        title: true,
        introduce: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { name: true } },
      },
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
resumeRouter.get(
  '/:resumeId',
  accessMiddleware,

  async (req, res, next) => {
    const { resumeId } = req.params;
    const userId = req.user.userId; // 현재 로그인한 사용자의 ID
    const userRole = req.user.role; // 현재 사용자의 역할

    try {
      let resume;

      // 채용 담당자인 경우 모든 이력서 조회 가능하거나 작성자 ID와 현재 로그인한 사용자의 ID가 모두 일치해야 함
      if (userRole === 'RECRUITER') {
        resume = await prisma.resume.findUnique({
          where: { resumeId: +resumeId },
          include: { user: { select: { name: true } } },
        });
      } else {
        resume = await prisma.resume.findUnique({
          where: {
            resumeId: +resumeId,
            userId: userId,
          },
          include: { user: { select: { name: true } } },
        });
      }

      if (!resume) {
        return res
          .status(400)
          .json({ message: '이력서는 본인과 채용 담당자만 볼 수 있습니다.' });
      }

      const Resume = {
        resumeId: resume.resumeId,
        name: resume.user.name,
        title: resume.title,
        introduce: resume.introduce,
        status: resume.status,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
      };

      return res.status(200).json({ Resume });
    } catch (error) {
      next(error);
    }
  }
);

/** 이력서 수정 API **/
resumeRouter.patch('/:resumeId', accessMiddleware, async (req, res, next) => {
  const { resumeId } = req.params;
  const { title, introduce } = req.body;

  try {
    const post = await prisma.resume.findUnique({
      where: { resumeId: +resumeId },
      include: { user: { select: { name: true } } },
    });

    if (!post) {
      return res.status(400).json({ message: '이력서가 존재하지 않습니다.' });
    }
    if (!title && !introduce) {
      return res.status(400).json({ message: '수정 할 정보를 입력해 주세요.' });
    }

    const newResume = await prisma.resume.update({
      where: { resumeId: +resumeId }, // 이력서 ID로 업데이트
      data: { title, introduce }, // 수정할 정보
    });

    const Resume = {
      resumeId: newResume.resumeId,
      userId: newResume.userId,
      title: newResume.title,
      introduce: newResume.introduce,
      status: newResume.status,
      createdAt: newResume.createdAt,
      updatedAt: newResume.updatedAt,
    };

    return res.status(200).json({ Resume });
  } catch (error) {
    next(error);
  }
});

/** 게시글 삭제 API **/
resumeRouter.delete('/:resumeId', accessMiddleware, async (req, res, next) => {
  const { resumeId } = req.params;
  const userRole = req.user.role;
  const userId = req.user.userId;

  // 채용 담당자인 경우 모든 이력서 삭제 가능하거나 작성자 ID와 현재 로그인한 사용자의 ID가 모두 일치해야 함. if else 구문 때문에 let을 쓰는건가요?
  let resume;
  if (userRole === 'RECRUITER') {
    resume = await prisma.resume.findFirst({
      where: { resumeId: +resumeId },
    });
  } else {
    resume = await prisma.resume.findFirst({
      where: {
        resumeId: +resumeId,
        userId: +userId, // 본인의 이력서만 조회하도록 사용자 ID로 필터링
      },
    });
  }

  if (!resume)
    return res.status(404).json({
      message: '이력서는 본인의 이력서나 채용 담당자만 삭제 가능합니다.',
    });

  await prisma.resume.delete({ where: { resumeId: +resumeId } });

  return res.status(200).json({ resumeId: +resumeId });
});

// 이력서 지원상태 변경

resumeRouter.patch(
  '/status/:resumeId',

  resumeStatusValidator,
  accessMiddleware,
  requireRolesMiddleware([UserRole.RECRUITER]),

  async (req, res, next) => {
    try {
      const user = req.user;
      const { resumeId } = req.params;
      const { status, reason } = req.body;
      const recruiterId = user.userId;

      // Transaction 시작
      // 안에 있는것을 기다린다.
      await prisma.$transaction(async (tx) => {
        // 이력서 조회
        const resume = await tx.resume.findUnique({
          where: { resumeId: +resumeId },
        });
        if (!resume) {
          return res
            .status(400)
            .json({ message: '이력서가 존재하지 않습니다.' });
        }

        // 이력서 정보 수정
        const newResume = await tx.resume.update({
          where: { resumeId: +resumeId },
          data: { status },
        });
        // 이력서 로그 생성 (비동기로 실행)
        const resumeLogs = await tx.resumeLog.create({
          data: {
            resumeId: +resumeId,
            recruiterId,
            status: resume.status,
            newstatus: status, // 수정된 필드명
            reason,
          },
        });

        // 반환 정보
        return res
          .status(200)
          .json({ resumeLogs, message: '로그가 추가되었습니다.' });
      });
    } catch (error) {
      next(error);
    }
  }
);

// 로그상태 조회
resumeRouter.get(
  '/status/:resumeId',
  accessMiddleware,
  requireRolesMiddleware([UserRole.RECRUITER]),
  async (req, res, next) => {
    try {
      const { resumeId } = req.params;

      // 채용 담당자인 경우에만 특정 이력서 로그를 조회합니다.
      // 채용 담당자와 지원자 모두에게 이력서 로그를 반환해야 합니다.
      let data = await prisma.resumeLog.findMany({
        where: { resumeId: +resumeId },
        orderBy: { updatedAt: 'desc' }, // 내림차순으로 정렬합니다.
        select: {
          resumeId: true,
          logId: true,
          status: true,
          newstatus: true,
          reason: true,
          updatedAt: true,
          user: { select: { name: true } },
        },
      });
      data = data.map((log) => {
        return {
          resumeId: log.resumeId,
          user: log.user,
          logId: log.logId,
          status: log.status,
          newstatus: log.newstatus,
          reason: log.reason,
          updatedAt: log.updatedAt,
        };
      });

      if (!data) {
        // 조회된 로그가 없는 경우 빈 배열을 반환합니다.
        return res.status(200).json([]);
      }

      return res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  }
);

export default resumeRouter;
