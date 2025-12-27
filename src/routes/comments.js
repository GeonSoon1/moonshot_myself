import express from "express";
import prisma from "../lib/prisma.js";
import { authenticateToken } from "../middlewares/auth.js";

const router = express.Router();

/**
 * [댓글 조회]
 * GET /comments/:commentId
 */
router.get("/:commentId", authenticateToken, async (req, res) => {
  const { commentId } = req.params;
  const currentUserId = req.userId; // 로그인한 유저 ID

  try {
    const cId = Number(commentId);

    // 1. 댓글 데이터 조회 (작성자 정보 포함)
    const comment = await prisma.comment.findUnique({
      where: { id: cId },
      include: {
        author: {
          include: { member: true } // ProjectMember를 거쳐 User 정보까지 가져옴
        }
      }
    });

    // 2. 404 Not Found: 댓글이 없는 경우 (명세서: 바디 없음)
    if (!comment) {
      return res.status(404).end();
    }

    // 3. 403 Forbidden: 해당 프로젝트의 멤버인지 확인
    // (우리 스키마의 Comment 모델에는 projectId가 저장되어 있어 확인이 쉽습니다.)
    const isMember = await prisma.projectMember.findUnique({
      where: {
        projectId_memberId: {
          projectId: comment.projectId,
          memberId: currentUserId,
        },
      },
    });

    if (!isMember) {
      return res.status(403).json({ message: "프로젝트 멤버가 아닙니다" });
    }

    // 4. 200 OK: 명세서 형식에 맞춰 응답
    return res.status(200).json({
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
    });

  } catch (error) {
    console.error("댓글 상세 조회 오류:", error);
    // 400 Bad Request: 잘못된 요청 형식 (예: ID가 숫자가 아님)
    return res.status(400).json({ message: "잘못된 요청 형식" });
  }
});

/**
 * [댓글 수정]
 * PATCH /comments/:commentId
 */
router.patch("/:commentId", authenticateToken, async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;
  const currentUserId = req.userId; // 로그인한 유저 ID

  try {
    const cId = Number(commentId);

    // 1. 기존 댓글 조회 (권한 체크를 위해 projectId와 authorId가 필요함)
    const comment = await prisma.comment.findUnique({
      where: { id: cId }
    });

    // 2. 404 Not Found: 댓글이 없는 경우 (명세서: 바디 없음)
    if (!comment) {
      return res.status(404).end();
    }

    // 3. 403 Forbidden (Case 1): 해당 프로젝트의 멤버인지 먼저 확인
    const isMember = await prisma.projectMember.findUnique({
      where: {
        projectId_memberId: {
          projectId: comment.projectId,
          memberId: currentUserId,
        },
      },
    });

    if (!isMember) {
      return res.status(403).json({ message: "프로젝트 멤버가 아닙니다" });
    }

    // 4. 403 Forbidden (Case 2): 자신이 작성한 댓글인지 확인
    if (comment.authorId !== currentUserId) {
      return res.status(403).json({ message: "자신이 작성한 댓글만 수정할 수 있습니다" });
    }

    // 5. 400 Bad Request: 내용이 비어있는 경우 체크
    if (!content) {
      return res.status(400).json({ message: "잘못된 요청 형식" });
    }

    // 6. 실제 댓글 업데이트 실행
    const updatedComment = await prisma.comment.update({
      where: { id: cId },
      data: { content },
      include: {
        author: {
          include: { member: true } // 가공을 위해 유저 정보 포함
        }
      }
    });

    // 7. 200 OK: 명세서 형식에 맞춰 가공된 객체 반환
    return res.status(200).json({
      id: updatedComment.id,
      content: updatedComment.content,
      taskId: updatedComment.taskId,
      author: {
        id: updatedComment.author.member.id,
        name: updatedComment.author.member.name,
        email: updatedComment.author.member.email,
        profileImage: updatedComment.author.member.profileImage
      },
      createdAt: updatedComment.createdAt,
      updatedAt: updatedComment.updatedAt
    });

  } catch (error) {
    console.error("댓글 수정 오류:", error);
    return res.status(400).json({ message: "잘못된 요청 형식" });
  }
});


/**
 * [댓글 삭제]
 * DELETE /comments/:commentId
 */
router.delete("/:commentId", authenticateToken, async (req, res) => {
  const { commentId } = req.params;
  const currentUserId = req.userId; // 로그인한 유저 ID

  try {
    const cId = Number(commentId);

    // 1. 기존 댓글 조회
    const comment = await prisma.comment.findUnique({
      where: { id: cId }
    });

    // 2. 404 Not Found: 댓글이 없는 경우 (명세서: 바디 없음)
    if (!comment) {
      return res.status(404).end();
    }

    // 3. 403 Forbidden (Case 1): 해당 프로젝트의 멤버인지 확인
    const isMember = await prisma.projectMember.findUnique({
      where: {
        projectId_memberId: {
          projectId: comment.projectId,
          memberId: currentUserId,
        },
      },
    });

    if (!isMember) {
      return res.status(403).json({ message: "프로젝트 멤버가 아닙니다" });
    }

    // 4. 403 Forbidden (Case 2): 자신이 작성한 댓글인지 확인
    if (comment.authorId !== currentUserId) {
      return res.status(403).json({ message: "자신이 작성한 댓글만 삭제할 수 있습니다" });
    }

    // 5. 실제 댓글 삭제 실행
    await prisma.comment.delete({
      where: { id: cId }
    });

    // 6. 204 No Content: 성공 시 본문 없이 응답
    return res.status(204).end();

  } catch (error) {
    console.error("댓글 삭제 오류:", error);
    // 400 Bad Request: 잘못된 요청 형식
    return res.status(400).json({ message: "잘못된 요청 형식" });
  }
});

export default router;