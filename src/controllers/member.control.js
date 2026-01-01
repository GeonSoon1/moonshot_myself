import * as memberService from '../services/member.service.js';

export const getList = async (req, res) => res.json(await memberService.getMemberList(Number(req.params.projectId), Number(req.query.page || 1), Number(req.query.limit || 10)));

export const invite = async (req, res) => {
  // console.log('member.control의 req.params :', req.params)
  // req.params = { projectId: '30' }
  console.log('req.params.projectId :', req.params.projectId) // 30
  console.log('req.body.email :', req.body.email)// test14@example.com
  const result = await memberService.inviteUser(Number(req.params.projectId), req.body.email);
  console.log('memberepo -> member.service를 거쳐서 온 invitaion result :', result)
  res.status(201).json({ invitationId: result.id });
};

export const erase = async (req, res) => {
  await memberService.removeMember(Number(req.params.projectId), Number(req.params.userId));
  res.status(204).end();
};

export const accept = async (req, res) => {
  console.log('member.control에서의 req.user.id :', req.user.id)
  console.log('req.user.id 타입 :', typeof req.user.id)
  console.log('member.control에서의 req.params.invitationId :', req.params.invitationId)
  console.log('req.params.inviationId의 타입 :', typeof req.params.invitationId)
  await memberService.acceptInvitation(req.params.invitationId, req.user.id);
  res.status(200).end();
};

export const cancel = async (req, res) => {
  await memberService.cancelInvitation(req.params.invitationId);
  res.status(204).end();
};