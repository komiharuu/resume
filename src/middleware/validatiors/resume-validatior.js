import Joi from 'joi';

const ResumeSchema = Joi.object({
  title: Joi.string().required().messages({
    'any.required': '제목을 입력해주세요',
  }),
  introduce: Joi.string().required().min(150).messages({
    'any.required': '자기소개를 입력해주세요',
    'string.min': '자기소개는 6자 이상이어야 합니다.',
  }),
});

export const ResumeValidator = async (req, res, next) => {
  try {
    await ResumeSchema.validateAsync(req.body, { abortEarly: false });
    next();
  } catch (error) {
    const errorMessage = error.details
      .map((detail) => detail.message)
      .join(', ');
    //   앞에있는 문자들을 연결. detail만 뽑아서 메시지 배열을 만든다. 조인이 배열을 결합시킨다.
    //   ex) 안녕하세요, 안녕히계세요
    res.status(400).json({ message: errorMessage });
  }
};
