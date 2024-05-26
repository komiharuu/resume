import express from 'express';
import { prisma } from './index.js';
import accessMiddleware from '../middleware/require-access-token.middleware.js';
const router = express.Router();


export default router;