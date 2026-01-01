import * as projectRepo from '../repositories/project.repo.js';

function formatProject(p){
  console.log('project.service.js의 p의 값 :', p)
  return {
  id: p.id, 
  name: p.name, 
  description: p.description,
  memberCount: p._count?.projectMembers ?? 1,
  todoCount: (p.tasks || []).filter(t => t.status === "TODO").length,
  inProgressCount: (p.tasks || []).filter(t => t.status === "IN_PROGRESS").length,
  doneCount: (p.tasks || []).filter(t => t.status === "DONE").length,
  createdAt: p.createdAt, updatedAt: p.updatedAt
  }
};

export const createProject = async (userId, body) => {
  console.log('project.service의 userId :', userId)
  console.log('project.service의 body :', body)
  if (!body.name || !body.description) throw { status: 400, message: "잘못된 데이터 형식" };
  if (await projectRepo.countOwnedProjects(userId) >= 200) throw { status: 400, message: "프로젝트는 최대 5개까지만 생성 가능합니다." };
  console.log('project.service에서 result전까지 통과')
  const result = formatProject(await projectRepo.create({ ...body, ownerId: userId }));
  console.log('project.service의 result: ', result)
  return result;
};

export const getProjectList = async (userId) => {
  const projects = await projectRepo.findAllByMemberId(userId);
  return projects.map(p => formatProject(p));
};

export const getProjectDetail = async (projectId) => {
  const p = await projectRepo.findByIdWithStats(projectId);
  if (!p) throw { status: 404 };
  return formatProject(p);
};

export const updateProject = async (projectId, data) => {
  const updated = await projectRepo.update(projectId, data);
  return await getProjectDetail(updated.id);
};

export const deleteProject = async (projectId) => projectRepo.remove(projectId);