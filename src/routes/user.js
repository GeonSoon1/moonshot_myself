import express from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { authenticateToken } from "../middlewares/auth.js";
import { formatTask } from "./tasks.js"; // formatTask를 export 하셨다면 가져오기

const router = express.Router();

/**
 * [1] 내 정보 조회
 * GET /users/me
 */
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      return res.status(404).json({ message: "존재하지 않는 유저입니다" });
    }

    const { passwordHash, ...userWithoutPassword } = user;
    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    return res.status(400).json({ message: "잘못된 요청입니다" });
  }
});

/**
 * [2] 내 정보 수정
 * PATCH /users/me
 */
router.patch("/me", authenticateToken, async (req, res) => {
  const { email, name, currentPassword, newPassword, profileImage } = req.body;
  const userId = req.userId;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "존재하지 않는 유저입니다" });

    const updateData = {};
    if (email) updateData.email = email;
    if (name) updateData.name = name;
    if (profileImage !== undefined) updateData.profileImage = profileImage;

    // 비밀번호 변경 로직
    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ message: "현재 비밀번호가 일치하지 않습니다" });
      }
      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    const { passwordHash, ...result } = updatedUser;
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ message: "잘못된 데이터 형식" });
  }
});

/**
 * [3] 참여 중인 프로젝트 조회
 * GET /users/me/projects
 */
router.get("/me/projects", authenticateToken, async (req, res) => {
  const { page = 1, limit = 10, order = 'desc', order_by = 'created_at' } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  try {
    // 내가 멤버로 속해 있는 프로젝트 목록 조회
    const memberships = await prisma.projectMember.findMany({
      where: { memberId: req.userId },
      include: {
        project: {
          include: {
            _count: { select: { projectMembers: true } },
            tasks: { select: { status: true } }
          }
        }
      },
      skip,
      take: Number(limit),
      orderBy: order_by === 'name' 
        ? { project: { name: order } } 
        : { project: { createdAt: order } }
    });
    // console.log('users.js에서 memberships : ' , memberships)
    // console.log('users.js에서 memberships count : ' , memberships[0].project._count)

    const total = await prisma.projectMember.count({ where: { memberId: req.userId } });

    const data = memberships.map(m => {
      const p = m.project;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        memberCount: p._count.projectMembers,
        todoCount: p.tasks.filter(t => t.status === "TODO").length,
        inProgressCount: p.tasks.filter(t => t.status === "IN_PROGRESS").length,
        doneCount: p.tasks.filter(t => t.status === "DONE").length,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      };
    });

    return res.status(200).json({ data, total });
  } catch (error) {
    return res.status(400).json({ message: "잘못된 요청입니다" });
  }
});

/**
 * [4] 참여 중인 모든 프로젝트의 할 일 목록 조회
 * GET /users/me/tasks
 */
router.get("/me/tasks", authenticateToken, async (req, res) => {
  const { from, to, project_id, status, assignee_id, keyword } = req.query;

  try {
    // 필터 조건 구성
    const where = {
      project: {
        projectMembers: { some: { memberId: req.userId } } // 내가 참여 중인 프로젝트들
      },
      ...(project_id && { projectId: Number(project_id) }),
      ...(status && { status: status.toUpperCase() }),
      ...(assignee_id && { assigneeProjectMemberId: Number(assignee_id) }),
      ...(keyword && { title: { contains: keyword, mode: 'insensitive' } }),
      // 날짜 범위 필터 (YYYY-MM-DD)
      ...(from && to && {
        startDate: { gte: new Date(from) },
        endDate: { lte: new Date(to) }
      })
    };

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assigneeProjectMember: { include: { member: true } },
        taskTags: { include: { tag: true } },
        attachments: true
      },
      orderBy: { createdAt: 'desc' }
    });
    console.log('tasks : ', tasks[0].assigneeProjectMember.member)

    return res.status(200).json(tasks.map(t => formatTask(t)));
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "잘못된 요청 형식" });
  }
});

export default router;