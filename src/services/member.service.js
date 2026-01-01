import * as memberRepo from '../repositories/member.repo.js';
import * as projectRepo from '../repositories/project.repo.js';

export const getMemberList = async (projectId, page, limit) => {
  const skip = (page - 1) * limit;
  const project = await projectRepo.findByIdWithStats(projectId);
  const ownerPM = await memberRepo.findMember(projectId, project.ownerId);
  const invitations = await memberRepo.findInvitations(projectId, skip, limit);
  const total = await memberRepo.countInvitations(projectId);

  const data = invitations.map(inv => ({
    id: inv.inviteeUser.id, name: inv.inviteeUser.name, email: inv.inviteeUser.email,
    profileImage: inv.inviteeUser.profileImage,
    taskCount: inv.projectMember ? inv.projectMember._count.tasksAssigned : 0,
    status: inv.status.toLowerCase(), invitationId: inv.id
  }));

  if (page === 1) data.unshift({
    id: project.owner.id, name: project.owner.name, email: project.owner.email,
    profileImage: project.owner.profileImage,
    taskCount: ownerPM ? ownerPM._count.tasksAssigned : 0, status: "accepted", invitationId: null
  });

  return { data, total: total + 1 };
};

export const inviteUser = async (projectId, email) => {
  // projectId = 30
  // email = test14@example.com
  const invitee = await memberRepo.findUserByEmail(email);
  console.log('member.service에서의 invitee(초대 받은 사람) :', invitee)

  if (!invitee) throw { status: 404, message: "유저를 찾을 수 없습니다" };
  console.log('projectId :', projectId)
  console.log('invitee.id :', invitee.id)
  if (await memberRepo.findMember(projectId, invitee.id)) throw { status: 400, message: "이미 프로젝트 멤버입니다" };
  // 아직 Accepted를 안해서 null이면 fasle 취급 받기 떄문에 if (false)면 건너 뛴다.
  console.log('member.service의 projectId :', projectId)
  console.log('inviteeUserId :', invitee.id)
  const invitation = await memberRepo.createInvitation({ projectId, inviteeUserId: invitee.id });
  console.log('member.repo에서 넘어온 invitation :', invitation)
  return invitation
};

export const acceptInvitation = async (invitationId, userId) => {
  const inv = await memberRepo.findInvitationById(invitationId);
  console.log('member.service의 inv :', inv)

  if (!inv || inv.inviteeUserId !== userId) throw { status: 404 };
  if (inv.status !== "PENDING") throw { status: 400, message: "이미 처리된 초대장입니다" };
  console.log('member.service의 invitationId :', invitationId)
  console.log('member.service의 inv.projectId :', inv.projectId)
  console.log('member.service의 userId :', userId)
  return await memberRepo.acceptInviteTransaction(invitationId, inv.projectId, userId);
};

export const removeMember = async (projectId, userId) => memberRepo.deleteMember(projectId, userId);
export const cancelInvitation = async (invitationId) => memberRepo.deleteInvitation(invitationId);