import * as taskRepo from "../repositories/task.repo.js";
import { formatTask } from "../lib/utils.js";

export const createNewTask = async (projectId, userId, body) => {
  const data = {
    title: body.title,
    description: body.description,
    status: body.status?.toUpperCase() || "TODO",

    // 프론트엔드에서 받은 날짜 데이터를 데이터베이스가 이해할 수 있는 표준 Date 객체로 변환하여 저장
    startDate: new Date(body.startYear, body.startMonth - 1, body.startDay),
    endDate: new Date(body.endYear, body.endMonth - 1, body.endDay),
    projectId,
    taskCreatorId: userId,
    assigneeProjectMemberId: userId,
    taskTags: { 
      create: body.tags?.map(name => ({ tag: { 
        connectOrCreate: { where: { name }, 
        create: { name } 
      } } 
    })) 
  },
    attachments: { create: body.attachments?.map(url => ({ url })) }
  };
  console.log('task.service에서의 data :', data)
  return formatTask(await taskRepo.createTask(data));
};

export const getTaskList = async (projectId, query) => {
  const { page = 1, limit = 10, status, assignee, keyword, order = 'desc', order_by = 'created_at' } = query;
  const where = {
    projectId,
    ...(status && { status: status.toUpperCase() }),
    ...(assignee && { assigneeProjectMemberId: Number(assignee) }),
    ...(keyword && { title: { contains: keyword, mode: 'insensitive' } }),
  };
  const orderBy = { created_at: { createdAt: order }, name: { title: order }, end_date: { endDate: order } }[order_by] || { createdAt: 'desc' };

  const [tasks, total] = await Promise.all([
    taskRepo.findMany(where, (Number(page) - 1) * Number(limit), Number(limit), orderBy),
    taskRepo.count(where)
  ]);
  return { data: tasks.map(t => formatTask(t)), total };
};

export const getTaskDetail = async (id) => {
  const task = await taskRepo.findById(id);
  if (!task) throw { status: 404 };
  return formatTask(task);
};

export const updateTaskInfo = async (id, body) => {
  const updateData = {};
  if (body.title) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.status) updateData.status = body.status.toUpperCase();
  if (body.startYear) updateData.startDate = new Date(body.startYear, body.startMonth - 1, body.startDay);
  if (body.endYear) updateData.endDate = new Date(body.endYear, body.endMonth - 1, body.endDay);
  if (body.assigneeId) updateData.assigneeProjectMemberId = Number(body.assigneeId);

  const updated = await taskRepo.updateWithTransaction(id, updateData, body.tags, body.attachments);
  return formatTask(updated);
};

export const deleteTask = async (id) => await taskRepo.remove(id);