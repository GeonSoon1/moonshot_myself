import * as taskService from "../services/task.service.js";

export const create = async (req, res) => {
  console.log('task.control에서의 req.user :', req.user)
  console.log('task.control에서의 req.body :', req.body)
  console.log('task.control에서의 req.params.projectId :', req.params.projectId)
  const result = await taskService.createNewTask(Number(req.params.projectId), req.user.id, req.body);
  res.status(200).json(result);
};

export const getList = async (req, res) => {
  const result = await taskService.getTaskList(Number(req.params.projectId), req.query);
  res.json(result);
};

export const getDetail = async (req, res) => {
  res.json(await taskService.getTaskDetail(Number(req.params.taskId)));
};

export const update = async (req, res) => {
  const result = await taskService.updateTaskInfo(Number(req.params.taskId), req.body);
  res.json(result);
};

export const remove = async (req, res) => {
  await taskService.deleteTask(Number(req.params.taskId));
  res.status(204).end();
};