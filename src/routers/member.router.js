import express from 'express';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { authenticate } from '../middlewares/authenticate.js';
import * as memberControl from '../controllers/member.control.js';

const memberRouter = express.Router();

// /invitations 로 시작하는 경로들
memberRouter.post('/:invitationId/accept', authenticate, asyncHandler(memberControl.accept));
memberRouter.delete('/:invitationId', authenticate, asyncHandler(memberControl.cancel));

export default memberRouter;