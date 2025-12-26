import express from "express";
import prisma from "../lib/prisma.js";
import { authenticateToken } from "../middlewares/auth.js";

const router = express.Router();

// [통계 데이터를 포함한 프로젝트 정보를 가져오는 공통 함수]
async function getProjectWithCounts(projectId) {
  const project = await prisma.project.findUnique({
    where: { id: Number(projectId) },
    include: {
      _count: {
        select: {
          projectMembers: true,
          tasks: true, // 전체 태스크 수 (참고용)
        },
      },
      tasks: {
        select: { status: true },
      },
    },
  });
  console.log('projectId로 가져온 project의 row : ', project)

  if (!project) return null;

  // 상태별 태스크 개수 계산
  const todoCount = project.tasks.filter((t) => t.status === "TODO").length;
  const inProgressCount = project.tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const doneCount = project.tasks.filter((t) => t.status === "DONE").length;
  console.log('project.tasks의 값 : ', project.tasks)

  // project.tasks의 모습(예상)
//   "tasks": [
//   { "status": "TODO" },
//   { "status": "DONE" },
//   { "status": "TODO" },
//   { "status": "IN_PROGRESS" }
// ]

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    memberCount: project._count.projectMembers,
    todoCount,
    inProgressCount,
    doneCount,
  };
}

// 1. 프로젝트 생성 (POST /projects)
router.post("/", authenticateToken, async (req, res) => {
  const { name, description } = req.body;
  const userId = req.userId;

  try {
    // 400 에러 처리
    if (!name || !description) {
      return res.status(400).json({ message: "잘못된 데이터 형식" });
    }

    // 프로젝트 생성 시 소유자를 멤버로 등록
    const newProject = await prisma.project.create({
      data: {
        name,
        description,
        ownerId: userId,
        projectMembers: {
          create: { memberId: userId, role: "OWNER" },
        },
      },
    });

    // 명세서에 맞는 응답 데이터 구성 (생성 직후엔 멤버 1명, 태스크 0개)
    return res.status(200).json({
      id: newProject.id,
      name: newProject.name,
      description: newProject.description,
      memberCount: 1,
      todoCount: 0,
      inProgressCount: 0,
      doneCount: 0,
    });
  } catch (error) {
    return res.status(400).json({ message: "잘못된 데이터 형식" });
  }
});

// 2. 프로젝트 조회 (GET /projects/:projectId)
router.get("/:projectId", authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  const userId = req.userId;

  try {
    // 해당 프로젝트의 멤버인지 확인 (403 에러 처리용)
    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_memberId: {
          projectId: Number(projectId),
          memberId: userId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({ message: "프로젝트 멤버가 아닙니다" });
    }

    const projectData = await getProjectWithCounts(projectId);
    if (!projectData) return res.status(404).end();

    return res.status(200).json(projectData);
  } catch (error) {
    return res.status(404).end();
  }
});

// 3. 프로젝트 수정 (PATCH /projects/:projectId)
router.patch("/:projectId", authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  const { name, description } = req.body;
  const userId = req.userId;

  try {
    if (!name || !description) {
      return res.status(400).json({ message: "잘못된 데이터 형식" });
    }

    // 멤버 권한 확인
    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_memberId: {
          projectId: Number(projectId),
          memberId: userId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({ message: "프로젝트 멤버가 아닙니다" });
    }

    // 업데이트
    await prisma.project.update({
      where: { id: Number(projectId) },
      data: { name, description },
    });

    const updatedData = await getProjectWithCounts(projectId);
    return res.status(200).json(updatedData);
  } catch (error) {
    return res.status(400).json({ message: "잘못된 데이터 형식" });
  }
});

// 4. 프로젝트 삭제 (DELETE /projects/:projectId)
router.delete("/:projectId", authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  const userId = req.userId;

  try {
    const project = await prisma.project.findUnique({
      where: { id: Number(projectId) },
    });

    if (!project) return res.status(404).end();

    // 명세서: "프로젝트 관리자가 아닙니다" (삭제는 Owner만 가능)
    if (project.ownerId !== userId) {
      return res.status(403).json({ message: "프로젝트 관리자가 아닙니다" });
    }

    await prisma.project.delete({
      where: { id: Number(projectId) },
    });

    return res.status(204).end();
  } catch (error) {
    return res.status(400).json({ message: "잘못된 데이터 형식" });
  }
});

export default router;