import express from "express";
import prisma from "../lib/prisma.js";
import { authenticateToken } from "../middlewares/auth.js";
import { formatTask } from './tasks.js'

const router = express.Router();

/**
 * 프로젝트 관련
 */

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
  // console.log("projectId로 가져온 project의 row : ", project);

  if (!project) return null;

  // 상태별 태스크 개수 계산
  const todoCount = project.tasks.filter((t) => t.status === "TODO").length;
  const inProgressCount = project.tasks.filter(
    (t) => t.status === "IN_PROGRESS"
  ).length;
  const doneCount = project.tasks.filter((t) => t.status === "DONE").length;
  // console.log("project.tasks의 값 : ", project.tasks);

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

/**
 * 멤버 초대하기
 */

// [1] 멤버 초대하기 (POST /projects/:projectId/invitations)
router.post("/:projectId/invitations", authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  const { email } = req.body;

  // 현재 로그인 한 사람
  const currentUserId = req.userId;

  try {
    if (!email) return res.status(400).json({ message: "잘못된 요청 형식" });

    const project = await prisma.project.findUnique({
      where: { id: Number(projectId) },
    });
    if (!project || project.ownerId !== currentUserId) {
      //프로젝트 생성자만 멤버로 초대할 수 있습니다.
      return res.status(403).json({ message: "프로젝트 관리자가 아닙니다" });
    }

    // 초대한 유저가 user테이블에 있는지 확인
    const invitee = await prisma.user.findUnique({ where: { email } });
    if (!invitee)
      return res.status(404).json({ message: "유저를 찾을 수 없습니다" });

    const isMember = await prisma.projectMember.findUnique({
      where: {
        projectId_memberId: {
          projectId: Number(projectId),
          memberId: invitee.id,
        },
      },
    });
    if (isMember)
      return res.status(400).json({ message: "이미 프로젝트 멤버입니다" });

    const invitation = await prisma.invitation.create({
      data: {
        projectId: Number(projectId),
        inviteeUserId: invitee.id,
        status: "PENDING",
      },
    });

    return res.status(201).json({ invitationId: invitation.id });
  } catch (error) {
    return res.status(400).json({ message: "잘못된 요청 형식" });
  }
});

/**
 * [2] 초대한 멤버 목록 조회 (GET /projects/:projectId/users)
 */

router.get("/:projectId/users", authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    // 1. 프로젝트 정보와 소유자(Owner)를 먼저 가져옵니다.
    const project = await prisma.project.findUnique({
      where: { id: Number(projectId) },
      include: { owner: true }, // 소유자 정보 포함
    });

    if (!project) return res.status(404).json({ message: "프로젝트 없음" });

    // 2. 소유자의 ProjectMember 데이터를 조회하여 작업 수를 가져옵니다.
    const ownerMember = await prisma.projectMember.findUnique({
      where: {
        projectId_memberId: {
          projectId: Number(projectId),
          memberId: project.ownerId,
        },
      },
      include: {
        _count: { select: { tasksAssigned: true } },
      },
    });

    // 3. 초대장 목록을 가져옵니다 (PENDING, ACCEPTED, REJECTED)
    const invitations = await prisma.invitation.findMany({
      where: { projectId: Number(projectId) },
      include: {
        inviteeUser: true,
        projectMember: {
          include: { _count: { select: { tasksAssigned: true } } },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const totalInvitations = await prisma.invitation.count({
      where: { projectId: Number(projectId) },
    });

    // console.log("[projects.js] 초대받은 사람들의 데이터 : ", invitations);

    // 4. 초대받은 사람들의 데이터를 명세서 포맷으로 가공
    const invitationData = invitations.map((inv) => ({
      id: inv.inviteeUser.id,
      name: inv.inviteeUser.name,
      email: inv.inviteeUser.email,
      profileImage: inv.inviteeUser.profileImage,
      taskCount: inv.projectMember ? inv.projectMember._count.tasksAssigned : 0,
      status: inv.status.toLowerCase(), // pending, accepted, rejected
      invitationId: inv.id,
    }));

    // 5. [중요] 소유자(Owner)는 초대장에 없으므로 수동으로 추가해줍니다.
    // (페이지가 1페이지일 때만 맨 앞에 넣어주는 것이 일반적입니다.)
    let finalData = invitationData;
    if (page === 1) {
      const ownerData = {
        id: project.owner.id,
        name: project.owner.name,
        email: project.owner.email,
        profileImage: project.owner.profileImage,
        taskCount: ownerMember ? ownerMember._count.tasksAssigned : 0,
        status: "accepted", // 소유자는 항상 accepted 상태
        invitationId: null, // 소유자는 초대장이 없음
      };
      finalData = [ownerData, ...invitationData];
    }

    return res.status(200).json({
      data: finalData,
      total: totalInvitations + 1, // 소유자 1명 포함
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "잘못된 요청 형식" });
  }
});


/**
 * [프로젝트에서 멤버 제외하기]
 * DELETE /projects/:projectId/users/:userId
 */
router.delete("/:projectId/users/:userId", authenticateToken, async (req, res) => {
    const { projectId, userId } = req.params;
    const currentUserId = req.userId; // 현재 로그인한 사람 (요청자)

    try {
      const project = await prisma.project.findUnique({
        where: { id: Number(projectId) },
      });
      if (project.ownerId !== currentUserId) {
        return res.status(403).json({ message: "프로젝트 관리자가 아닙니다" });
      }

      if (project.ownerId === Number(userId)) {
        return res
          .status(400)
          .json({ message: "소유자 자신은 제외할 수 없습니다" });
      }

      await prisma.projectMember.delete({
        where: {
          projectId_memberId: { // "특정 프로젝트"와 "특정 유저"가 만나는 지점
            projectId: Number(projectId),
            memberId: Number(userId),
          },
        },
      });

      return res.status(204).end();
    } catch (error) {
      return res.status(400).json({ message: "잘못된 요청 형식" });
    }
  }
);


/**
 * [1] 프로젝트에 할 일 생성
 * POST /projects/:projectId/tasks
 */
router.post("/:projectId/tasks", authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  const currentUserId = req.userId; // 현재 로그인한 사람
  
  const { 
    title, startYear, startMonth, startDay, 
    endYear, endMonth, endDay, status, tags, attachments 
  } = req.body;

  try {
    const pId = Number(projectId);

    // 1. 내가 해당 프로젝트의 멤버인지 확인
    // (내가 멤버여야 이 프로젝트에 글을 쓸 수 있고, 나를 담당자로 지정할 수 있으니까요)
    const myMember = await prisma.projectMember.findUnique({
      where: { 
        projectId_memberId: { 
          projectId: pId, 
          memberId: currentUserId 
        } 
      }
    });

    if (!myMember) {
      return res.status(403).json({ message: "프로젝트 멤버가 아닙니다" });
    }

    // 2. 날짜 생성
    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);
    
    // 3. 할 일 생성
    const task = await prisma.task.create({
      data: {
        title,
        status: status.toUpperCase(), 
        startDate,
        endDate,
        projectId: pId,
        // 만든 사람과 담당자를 모두 현재 로그인한 유저(나)로 설정!
        taskCreatorId: currentUserId,
        assigneeProjectMemberId: currentUserId, 
        
        taskTags: {
          create: tags?.map(name => ({
            tag: { connectOrCreate: { where: { name }, create: { name } } }
          }))
        },
        attachments: {
          create: attachments?.map(url => ({ url }))
        }
      },
      include: {
        assigneeProjectMember: { include: { member: true } },
        taskTags: { include: { tag: true } },
        attachments: true
      }
    });
    // console.log(task)
    return res.status(200).json(formatTask(task));
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "잘못된 요청 형식" });
  }
});


/**
 * [2] 프로젝트의 할 일 목록 조회
 * GET /projects/:projectId/tasks
 */
router.get("/:projectId/tasks", authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  const { page = 1, limit = 10, status, assignee, keyword, order = 'desc', order_by = 'created_at' } = req.query;

  try {
    const pId = Number(projectId);
    const skip = (Number(page) - 1) * Number(limit);

    // 필터 조건 구성
    const where = {
      projectId: pId,
      ...(status && { status: status.toUpperCase() }),
      ...(assignee && { assigneeProjectMemberId: Number(assignee) }),
      ...(keyword && { title: { contains: keyword, mode: 'insensitive' } }),
    };

    // 정렬 조건 구성
    const orderByMap = {
      created_at: { createdAt: order },
      name: { title: order },
      end_date: { endDate: order }
    };

    const [tasks, total] = await prisma.$transaction([
      prisma.task.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: orderByMap[order_by] || { createdAt: 'desc' },
        include: {
          assigneeProjectMember: { include: { member: true } },
          taskTags: { include: { tag: true } },
          attachments: true
        }
      }),
      prisma.task.count({ where })
    ]);

    return res.status(200).json({
      data: tasks.map(t => formatTask(t)),
      total
    });
  } catch (error) {
    return res.status(400).json({ message: "잘못된 요청 형식" });
  }
});

export default router;