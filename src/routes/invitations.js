import express from 'express';
import prisma from '../lib/prisma.js'
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router()

/**
 * 멤버 초대 수락
 */
router.post("/:invitationId/accept", authenticateToken, async (req, res) => {
  const { invitationId } = req.params;
  const userId = req.userId; // 수락할려는 사람

  try {
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId }
    });

    if (!invitation || invitation.inviteeUserId !== userId) {
      return res.status(404).json({ message: "초대장을 찾을 수 없습니다" });
    }

    if (invitation.status !== "PENDING") {
      return res.status(400).json({ message: "이미 처리된 초대장입니다" });
    }

    // 트랜잭션: 상태 변경과 멤버 추가를 동시에
    await prisma.$transaction([
      prisma.invitation.update({
        where: { id: invitationId },
        data: { status: "ACCEPTED" }
      }),
      prisma.projectMember.create({
        data: {
          projectId: invitation.projectId,
          memberId: userId,
          role: "MEMBER",
          invitationId: invitation.id // 연결
        }
      })
    ]);

    return res.status(200).end();
  } catch (error) {
    return res.status(400).json({ message: "잘못된 요청 형식" });
  }
});


/**
 * [멤버 초대 삭제]
 * DELETE /invitations/:invitationId
 */
router.delete("/invitations/:invitationId", authenticateToken, async (req, res) => {
  const { invitationId } = req.params;
  const currentUserId = req.userId; // 현재 로그인한 사람

  try {
    // 1. 초대장 존재 여부 확인 (404 처리)
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { project: true } // 권한 체크를 위해 프로젝트 정보 포함
    });

    if (!invitation) {
      return res.status(404).end(); // 명세서 404: (없음)
    }

    // 2. 권한 확인: 프로젝트 소유자만 초대를 삭제(취소)할 수 있음 (403 처리)
    if (invitation.project.ownerId !== currentUserId) {
      return res.status(403).json({ message: "권한이 없습니다." });
    }

    // 3. 실제 초대장 삭제 실행
    await prisma.invitation.delete({
      where: { id: invitationId }
    });

    // 4. 성공 시 204 No Content
    return res.status(204).end();

  } catch (error) {
    console.error("초대 삭제 오류:", error);
    return res.status(400).json({ message: "잘못된 요청 형식" });
  }
});

export default router 