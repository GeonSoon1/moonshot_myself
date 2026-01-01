import * as projectService from '../services/project.service.js';

export const create = async(req, res) => {
  // console.log("create 까지")
  console.log('project.controller의 req.user.id :',req.user.id)
  console.log('project.controller의 req.body :',req.body)
  const result = await projectService.createProject(req.user.id, req.body)
  console.log('project.control의 result: ', result)
  res.json(result)
}

export const getList = async (req, res) => {
  const result = await projectService.getProjectList(req.user.id);
  res.json({ data: result, total: result.length });
};

export const getDetail = async (req, res) => res.json(await projectService.getProjectDetail(Number(req.params.projectId)));

export const update = async (req, res) => res.json(await projectService.updateProject(Number(req.params.projectId), req.body));

export const remove = async (req, res) => {
  await projectService.deleteProject(Number(req.params.projectId));
  res.status(204).end();
};