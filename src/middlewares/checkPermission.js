import prisma from '../lib/prismaClient.js';
import { asyncHandler } from './asyncHandler.js';

/**
 * [도우미 함수] 주소창에 projectId가 없어도 하위 ID로 프로젝트 ID를 찾아냄
 */
async function resolveProjectId(params) {
  // 1. 하위 할 일 ID가 있는 경우
  console.log('checkPermission_resolveProjectId의 params :', params)
  // console.log('params의 타입 :', typeof params)
  if (params.subTaskId) {
    const subtask = await prisma.subTask.findUniqueOrThrow({ where: { id: Number(params.subTaskId) } });
    const task = await prisma.task.findUniqueOrThrow({ where: { id: subtask.taskId } });
    return task.projectId;
  }
  // 2. 할 일 ID가 있는 경우
  if (params.taskId) {
    // console.log('할 일 ID가 있는 경우 거쳐가나?')
    const task = await prisma.task.findUniqueOrThrow({ where: { id: Number(params.taskId) } });
    return task.projectId;
  }
  // 3. 프로젝트 ID가 있는 경우
  if (params.projectId) {
    console.log('req.params.projectId :', params.projectId)
    return Number(params.projectId);
  }
  return null;
}

// [1] 프로젝트 소유자 확인
export const projectOwner = asyncHandler(async (req, res, next) => {
  // console.log('checkPermission_invitation_req :', req)
  // console.log('checkPermission_invitation_req.params :',req.params)
  // req.params = { projectId : '30'}
  const projectId = await resolveProjectId(req.params);
  // projectId = '30'

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true }
  });
  console.log('projectOwner의 onwerId(project 만든사람) :', project)

  // 만약에 project만든 사람이 없으면 끝
  if (!project) return res.status(404).end();
  
  // authenticate 미들웨어에서 넣어준 req.user.id 사용
  // 초대장을 보내는 사람이 project owner인지 확인
  if (req.user.id !== project.ownerId) {
    return res.status(403).json({ message: "프로젝트 오너가 아닙니다." });
  }
  next();
});

// [2] 프로젝트 멤버 확인
export const projectMember = asyncHandler(async (req, res, next) => {
  console.log('projectMember의 req.params :', req.params)
  const projectId = await resolveProjectId(req.params);
  if (!projectId) return res.status(400).json({ message: "프로젝트 번호가 없습니다." });
  
  // 할 일을 만든 사람이 해당 프로젝트의 멤버인지 확인하는 절차.
  console.log('projectMember에서 projectId :', projectId)
  console.log('projectMember에서 memberId(할 일 생성자) :', req.user.id)
  // 할 일 생성자의 (projectId, memberId가 일치 하는지 확인)
  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_memberId: {
        projectId: projectId,
        memberId: req.user.id
      }
    }
  });
  console.log('할 일 생성자의 projectMember 테이블에서의 row :', membership)
  if (!membership) {
    return res.status(403).json({ message: "프로젝트 멤버가 아닙니다." });
  }
  next();
});

// [3] 댓글 작성자 확인
export const commentAuthor = asyncHandler(async (req, res, next) => {
  const commentId = Number(req.params.commentId);
  
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true }
  });

  if (!comment) return res.status(404).end();

  if (req.user.id !== comment.authorId) {
    return res.status(403).json({ message: "댓글 저자가 아닙니다." });
  }
  next();
});

export default {
  projectOwner,
  projectMember,
  commentAuthor
};