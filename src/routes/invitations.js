import express from 'express';
import prisma from '../lib/prisma.js'
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router()

router.post("/:projectId/invitations", authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  const { email } = req.body;
  const ownerId = req.userId;

  try {
    if (!email) return res.status(400).json({ message: "잘못된 요청 형식" });

    // 1. 소유자 권한 확인
    const project = await prisma.project.findUnique({ where: { id: Number(projectId) } });
    if (!project || project.ownerId !== ownerId) {
      return res.status(403).json({ message: "프로젝트 관리자가 아닙니다" });
    }

    // 2. 초대할 유저 찾기
    const invitee = await prisma.user.findUnique({ where: { email } });
    if (!invitee) return res.status(404).json({ message: "유저를 찾을 수 없습니다" });

    // 3. 중복 체크 (이미 멤버인지)
    const isMember = await prisma.projectMember.findUnique({
      where: { projectId_memberId: { projectId: Number(projectId), memberId: invitee.id } }
    });
    if (isMember) return res.status(400).json({ message: "이미 프로젝트 멤버입니다" });

    // 4. 초대장 생성 (UUID는 자동으로 생성됨)
    const invitation = await prisma.invitation.create({
      data: {
        projectId: Number(projectId),
        inviteeUserId: invitee.id,
        status: "PENDING"
      }
    });

    console.log(`[초대 코드 생성]: ${invitation.id}`); // 개발 환경 콘솔 출력
    return res.status(201).json({ invitationId: invitation.id });
  } catch (error) {
    return res.status(400).json({ message: "잘못된 요청 형식" });
  }
});


router.get("/:projectId/users", authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  try {
    // 1. 멤버 및 초대장 목록 조회
    // 명세서에는 status(pending, accepted 등)가 포함되어야 함
    // 여기서는 ProjectMember(이미 수락한 사람)를 기준으로 가져오고 
    // 추가로 Invitation(아직 수락 안 한 사람)을 가져와 합치는 로직이 필요함
    
    // 단순화를 위해 ProjectMember 테이블을 기준으로 하되, 
    // 초대 상태를 알기 위해 Invitation을 include 합니다.
    const members = await prisma.projectMember.findMany({
      where: { projectId: Number(projectId) },
      include: {
        member: true, // 유저 정보
        invitation: true, // 초대 정보
        _count: { select: { tasksAssigned: true } } // 할 일 개수
      },
      skip,
      take: Number(limit)
    });

    const total = await prisma.projectMember.count({ where: { projectId: Number(projectId) } });

    const data = members.map(m => ({
      id: m.member.id,
      name: m.member.name,
      email: m.member.email,
      profileImage: m.member.profileImage,
      taskCount: m._count.tasksAssigned,
      status: m.invitation ? m.invitation.status : "ACCEPTED", // 초대장이 없으면 원본 소유자이므로 ACCEPTED
      invitationId: m.invitationId
    }));

    return res.status(200).json({ data, total });
  } catch (error) {
    return res.status(400).json({ message: "잘못된 요청 형식" });
  }
});


router.post("/invitations/:invitationId/accept", authenticateToken, async (req, res) => {
  const { invitationId } = req.params;
  const userId = req.userId; // 수락하려는 사람

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


router.delete("/projects/:projectId/users/:userId", authenticateToken, async (req, res) => {
  const { projectId, userId } = req.params;
  const ownerId = req.userId;

  try {
    const project = await prisma.project.findUnique({ where: { id: Number(projectId) } });
    if (project.ownerId !== ownerId) {
      return res.status(403).json({ message: "프로젝트 관리자가 아닙니다" });
    }

    if (project.ownerId === Number(userId)) {
      return res.status(400).json({ message: "소유자 자신은 제외할 수 없습니다" });
    }

    await prisma.projectMember.delete({
      where: {
        projectId_memberId: {
          projectId: Number(projectId),
          memberId: Number(userId)
        }
      }
    });

    return res.status(204).end();
  } catch (error) {
    return res.status(400).json({ message: "잘못된 요청 형식" });
  }
});

router.delete("/invitations/:invitationId", authenticateToken, async (req, res) => {
  const { invitationId } = req.params;
  const userId = req.userId;

  try {
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { project: true }
    });

    if (!invitation) return res.status(404).end();

    // 소유자만 취소 가능
    if (invitation.project.ownerId !== userId) {
      return res.status(403).json({ message: "권한이 없습니다" });
    }

    await prisma.invitation.delete({ where: { id: invitationId } });
    
    return res.status(204).end();
  } catch (error) {
    return res.status(400).json({ message: "잘못된 요청 형식" });
  }
});