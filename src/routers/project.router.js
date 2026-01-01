import express from 'express';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { authenticate } from '../middlewares/authenticate.js';
import permission from '../middlewares/checkPermission.js';
import * as projectControl from '../controllers/project.control.js';
import * as memberControl from '../controllers/member.control.js'; // 💡 멤버 컨트롤러 필요

const projectRouter = express.Router();

projectRouter.post('/', authenticate, asyncHandler(projectControl.create));
projectRouter.get('/', authenticate, asyncHandler(projectControl.getList));
projectRouter.get('/:projectId', authenticate, permission.projectMember, asyncHandler(projectControl.getDetail));
projectRouter.patch('/:projectId', authenticate, permission.projectOwner, asyncHandler(projectControl.update));
projectRouter.delete('/:projectId', authenticate, permission.projectOwner, asyncHandler(projectControl.remove));

// /projects/:projectId 로 시작하는 멤버 관련 API들
projectRouter.get('/:projectId/users', authenticate, permission.projectMember, asyncHandler(memberControl.getList));
projectRouter.post('/:projectId/invitations', authenticate, permission.projectOwner, asyncHandler(memberControl.invite));
projectRouter.delete('/:projectId/users/:userId', authenticate, permission.projectOwner, asyncHandler(memberControl.erase));

export default projectRouter;