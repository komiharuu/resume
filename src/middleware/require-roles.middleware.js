// 역할 인가 미들웨어 : 그 역할을 줄지 안줄지 판단을 한다.
// 미들웨어 이유 : 중복코드를 방지

export const requireRolesMiddleware = (role) => {
  return (req, res, next) => {
    try {
      const user = req.user;

      const hasPermission = user && role.includes(user.role);
      // 접근 권한 user인지 그리고 user의 역할을 포함하는지 검증하는 부분입니다.

      if (!hasPermission) {
        return res.status(403).json({
          message: '접근 권한이 없습니다.',
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
