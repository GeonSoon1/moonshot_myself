import prisma from '../lib/prismaClient.js';

export const countOwnedProjects = (ownerId) => prisma.project.count({ where: { ownerId } });

export function create(data) {
  console.log('project.repo의 data :', data)
  const newProject = prisma.project.create({
  data: {
    ...data,
    projectMembers: { 
      create: { 
        memberId: data.ownerId, 
        role: 'OWNER' 
      } 
    }
  }});
  console.log('project.repo 데이터 생성 여기까지 통과')
  console.log('project.repo에서 create 거친 후의 newProject: ', newProject)
  return newProject
}



export const findAllByMemberId = (memberId) => prisma.project.findMany({
  where: { projectMembers: { some: { memberId } } },
  include: {
    _count: { select: { projectMembers: true } },
    tasks: { select: { status: true } }
  }
});

export const findByIdWithStats = (id) => prisma.project.findUnique({
  where: { id },
  include: {
    owner: true,
    _count: { select: { projectMembers: true } },
    tasks: { select: { status: true } }
  }
});

export const update = (id, data) => prisma.project.update({ where: { id }, data });
export const remove = (id) => prisma.project.delete({ where: { id } });
