// /middlewares/error-handler.middleware.js

export default function (err, req, res, next) {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ errorMessage: err.message });
  }

  if (err.name === 'responseError') {
    return res.status(400).json({ errorMessage: err.message });
  }
  console.error(err);

  return res
    .status(500)
    .json({ errorMessage: '서버에서 에러가 발생하였습니다.' });
}
