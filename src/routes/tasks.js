import express from "express";
import prisma from "../lib/prismaClient.js";
import { authenticateToken } from "../middlewares/authenticate.js";

const router = express.Router();

/**
 * [공통 헬퍼 함수] DB의 Date 객체를 명세서 형식(연, 월, 일 분리)으로 변환
 */
export function formatTask(task) {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    startYear: task.startDate.getFullYear(),
    startMonth: task.startDate.getMonth() + 1,
    startDay: task.startDate.getDate(),
    endYear: task.endDate.getFullYear(),
    endMonth: task.endDate.getMonth() + 1,
    endDay: task.endDate.getDate(),
    status: task.status.toLowerCase(), // "TODO" -> "todo"
    assignee: task.assigneeProjectMember ? {
      id: task.assigneeProjectMember.member.id,
      name: task.assigneeProjectMember.member.name,
      email: task.assigneeProjectMember.member.email,
      profileImage: task.assigneeProjectMember.member.profileImage,
    } : null,
    tags: task.taskTags.map(tt => ({ id: tt.tag.id, name: tt.tag.name })),
    attachments: task.attachments.map(a => a.url),
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

// 1. 우선 현재 작업 계층화 진행하기(09:00 ~ 12:00)
// 2. task 관련해서 이해하기(13:00 ~ 17:00)
// 3. 옮기기 (17:00 ~ 19:00)

/**
 * [3] 할 일 상세 조회
 * GET /tasks/:taskId
 */
router.get("/:taskId", authenticateToken, async (req, res) => {
  const { taskId } = req.params;
  try {
    const task = await prisma.task.findUnique({
      where: { id: Number(taskId) },
      include: {
        assigneeProjectMember: { include: { member: true } },
        taskTags: { include: { tag: true } },
        attachments: true
      }
    });

    if (!task) return res.status(404).end();

    return res.status(200).json(formatTask(task));
  } catch (error) {
    return res.status(400).json({ message: "잘못된 요청 형식" });
  }
});


/**
 * [할 일 수정]
 * PATCH /tasks/:taskId
 */
router.patch("/:taskId", authenticateToken, async (req, res) => {
  const { taskId } = req.params;
  const currentUserId = req.userId;
  
  const { 
    title, 
    description, 
    startYear, startMonth, startDay, 
    endYear, endMonth, endDay, 
    status, 
    assigneeId, // 새로운 담당자 유저 ID
    tags, 
    attachments 
  } = req.body;

  try {
    const tId = Number(taskId);

    // 1. 기존 할 일 정보 찾기 (어느 프로젝트에 속해 있는지 알아야 함)
    const existingTask = await prisma.task.findUnique({
      where: { id: tId }
    });
    if (!existingTask) return res.status(404).end();

    // 2. 권한 확인: 요청자가 해당 프로젝트의 멤버인지 확인
    const isMember = await prisma.projectMember.findUnique({
      where: { 
        projectId_memberId: { 
          projectId: existingTask.projectId, 
          memberId: currentUserId 
        } 
      }
    });
    if (!isMember) return res.status(403).json({ message: "프로젝트 멤버가 아닙니다" });

    // 3. 업데이트할 데이터 빌드
    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status.toUpperCase();

    // 날짜 처리
    if (startYear && startMonth && startDay) {
      updateData.startDate = new Date(startYear, startMonth - 1, startDay);
    }
    if (endYear && endMonth && endDay) {
      updateData.endDate = new Date(endYear, endMonth - 1, endDay);
    }

    // 4. 담당자 수정 (새 담당자도 반드시 프로젝트 멤버여야 함)
    if (assigneeId) {
      const newAssignee = await prisma.projectMember.findUnique({
        where: {
          projectId_memberId: {
            projectId: existingTask.projectId,
            memberId: Number(assigneeId)
          }
        }
      });
      if (!newAssignee) {
        return res.status(400).json({ message: "담당자가 프로젝트 멤버가 아닙니다" });
      }
      updateData.assigneeProjectMemberId = Number(assigneeId);
    }

    // 5. 트랜잭션 업데이트 (태그, 첨부파일 초기화 후 재설정)
    const updatedTask = await prisma.$transaction(async (tx) => {
      // 태그 교체
      if (tags) {
        await tx.taskTag.deleteMany({ where: { taskId: tId } });
        updateData.taskTags = {
          create: tags.map(name => ({
            tag: { connectOrCreate: { where: { name }, create: { name } } }
          }))
        };
      }

      // 첨부파일 교체
      if (attachments) {
        await tx.attachment.deleteMany({ where: { taskId: tId } });
        updateData.attachments = {
          create: attachments.map(url => ({ url }))
        };
      }

      // 실제 업데이트 실행
      return await tx.task.update({
        where: { id: tId },
        data: updateData,
        include: {
          assigneeProjectMember: { include: { member: true } },
          taskTags: { include: { tag: true } },
          attachments: true
        }
      });
    });

    // 6. [중요] 명세서 이미지대로 객체 하나만 즉시 반환 (data, total 없음)
    return res.status(200).json(formatTask(updatedTask));

  } catch (error) {
    console.error("할 일 수정 오류:", error);
    return res.status(400).json({ message: "잘못된 요청 형식" });
  }
});


/**
 * [5] 할 일 삭제
 * DELETE /tasks/:taskId
 */
router.delete("/:taskId", authenticateToken, async (req, res) => {
  const { taskId } = req.params;
  const userId = req.userId;

  try {
    const task = await prisma.task.findUnique({ where: { id: Number(taskId) } });
    if (!task) return res.status(404).end();

    // 권한 확인: 프로젝트 멤버만 삭제 가능
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_memberId: { projectId: task.projectId, memberId: userId } }
    });
    if (!membership) return res.status(403).json({ message: "프로젝트 멤버가 아닙니다" });

    await prisma.task.delete({ where: { id: Number(taskId) } });
    return res.status(204).end();
  } catch (error) {
    return res.status(400).json({ message: "잘못된 요청 형식" });
  }
});


/**
 * [1] 댓글 등록
 * POST /tasks/:taskId/comments
 */
router.post("/:taskId/comments", authenticateToken, async (req, res) => {
  const { taskId } = req.params;
  const { content } = req.body;
  const currentUserId = req.userId;

  try {
    const tId = Number(taskId);

    // 1. 해당 태스크가 존재하는지 확인 및 프로젝트 ID 추출
    const task = await prisma.task.findUnique({
      where: { id: tId }
    });
    if (!task) return res.status(404).json({ message: "할 일을 찾을 수 없습니다" });

    // 2. 작성자가 해당 프로젝트의 멤버인지 확인
    const authorMember = await prisma.projectMember.findUnique({
      where: { 
        projectId_memberId: { 
          projectId: task.projectId, 
          memberId: currentUserId 
        } 
      }
    });

    if (!authorMember) {
      return res.status(403).json({ message: "프로젝트 멤버만 댓글을 달 수 있습니다" });
    }

    // 3. 댓글 생성
    const comment = await prisma.comment.create({
      data: {
        content,
        taskId: tId,
        projectId: task.projectId,
        authorId: currentUserId, // ProjectMember의 memberId와 매칭됨
      },
      include: {
        author: {
          include: { member: true } // 작성자 이름, 이미지 포함을 위함
        }
      }
    });

    return res.status(201).json(formatComment(comment));
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "잘못된 요청 형식" });
  }
});


/**
 * [2] 할 일에 달린 댓글 조회
 * GET /tasks/:taskId/comments
 */
router.get("/:taskId/comments", authenticateToken, async (req, res) => {
  const { taskId } = req.params;
  // 1. 페이지네이션 파라미터 추출 (기본값 설정)
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const tId = Number(taskId);

    // 2. 트랜잭션으로 댓글 목록과 전체 개수를 동시에 조회
    const [comments, total] = await prisma.$transaction([
      prisma.comment.findMany({
        where: { taskId: tId },
        include: {
          author: {
            include: { member: true } // 작성자의 이름, 이메일, 이미지를 가져오기 위함
          }
        },
        skip: skip,
        take: limit,
        orderBy: { createdAt: 'desc' } // 최신 댓글이 위로 오도록 정렬 (기획에 따라 'asc'로 변경 가능)
      }),
      prisma.comment.count({
        where: { taskId: tId }
      })
    ]);

    // 3. 명세서 이미지의 응답 데이터 형식으로 가공
    const formattedData = comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      taskId: comment.taskId,
      author: {
        id: comment.author.member.id,
        name: comment.author.member.name,
        email: comment.author.member.email,
        profileImage: comment.author.member.profileImage
      },
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt
    }));

    // 4. 최종 응답 { data: [], total: n }
    return res.status(200).json({
      data: formattedData,
      total: total
    });

  } catch (error) {
    console.error("댓글 조회 오류:", error);
    return res.status(400).json({ message: "잘못된 요청 형식" });
  }
});


/**
 * [헬퍼 함수] 댓글 데이터를 명세서 형식으로 변환
 */
function formatComment(comment) {
  return {
    id: comment.id,
    content: comment.content,
    taskId: comment.taskId,
    author: {
      id: comment.author.member.id,
      name: comment.author.member.name,
      email: comment.author.member.email,
      profileImage: comment.author.member.profileImage
    },
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt
  };
}

export default router;