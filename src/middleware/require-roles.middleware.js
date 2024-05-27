export default async function  (req, res, next) {
    console.log(req.user)
    const userRole =  req.user.role;
      if (userRole !== 'RECRUITER') {
          return res.status(403).json({ message: '접근 권한이 없습니다.' });
      }
      next();
  };