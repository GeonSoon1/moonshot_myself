import prisma from "../lib/prismaClient.js";


export const createTask = async (data) => {
  const task = await prisma.task.create({
    data,
    include: { 
      assigneeProjectMember: { 
        include: { member: true } }, 
      taskTags: { 
        include: { tag: true } }, 
      attachments: true 
    }
});
  return task
}

export const findMany = (where, skip, take, orderBy) => prisma.task.findMany({
  where, skip, take, orderBy,
  include: { assigneeProjectMember: { include: { member: true } }, taskTags: { include: { tag: true } }, attachments: true }
});


export const count = (where) => prisma.task.count({ where });


export const findById = (id) => prisma.task.findUnique({
  where: { id },
  include: { assigneeProjectMember: { include: { member: true } }, taskTags: { include: { tag: true } }, attachments: true }
});


export const updateWithTransaction = (id, data, tags, attachments) => prisma.$transaction(async (tx) => {
  if (tags) await tx.taskTag.deleteMany({ where: { taskId: id } });
  if (attachments) await tx.attachment.deleteMany({ where: { taskId: id } });
  return await tx.task.update({
    where: { id },
    data,
    include: { assigneeProjectMember: { include: { member: true } }, taskTags: { include: { tag: true } }, attachments: true }
  });
});


export const remove = (id) => prisma.task.delete({ where: { id } });