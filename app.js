
import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import ErrorHandlingMiddleware from './src/middleware/error-handler.middleware.js';
import ResumeConstant from './src/constants/resume.constant.js';
import UsersRouter from './src/routers/users.router.js';
import ResumesRouter from './src/routers/resumes.router.js';
import AuthRouter from './src/routers/auth.router.js';
import accessMiddleware from './src/middleware/require-access-token.middleware.js';
import { prisma } from './src/routers/index.js';
import requireRolesMiddleware from './src/middleware/require-roles.middleware.js';
dotenv.config();

const app = express();
const PORT = process.env.PORT

app.use(express.json());
app.use(cookieParser());
app.use('/api', [UsersRouter, ResumesRouter, AuthRouter ]);
app.use(ErrorHandlingMiddleware);
app.patch( '/resume/:resumeId/status',  accessMiddleware, requireRolesMiddleware,
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

app.get('/resume/:resumeId/status', accessMiddleware, requireRolesMiddleware, async (req, res, next) => {
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
app.listen(PORT, () => {
  console.log(PORT, '포트로 서버가 열렸어요!');
});