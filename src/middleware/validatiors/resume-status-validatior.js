import Joi from 'joi';
import RESUMECONSTANT from '../../constants/resume.constant.js';

const resumeStatusSchema = Joi.object({
  status: Joi.required()
    .valid(...Object.values(RESUMECONSTANT))
    .messages({
      'any.required': '변경하고자 하는 지원 상태를 입력해 주세요.',
      'any.only': '유효하지 않은 지원 상태입니다.',
    }),
  reason: Joi.string().required().messages({
    'any.required': '지원 상태 변경 사유를 입력해 주세요.',
  }),
});

export const resumeStatusValidator = async (req, res, next) => {
  try {
    await resumeStatusSchema.validateAsync(req.body, { abortEarly: false });
    next();
  } catch (error) {
    const errorMessage = error.details
      .map((detail) => detail.message)
      .join(', ');
    res.status(400).json({ message: errorMessage });
  }
};
