import prisma from '../lib/prismaClient.js';

export const findUserByEmail = async (email) => {
  // email = test14@example.com
  const user = await prisma.user.findUnique({ where: { email }})
  console.log('member.repo에서 email로 찾은 user: ',user)
  return user
  // return user를 하는 순간, 자바스크립트는 이 알맹이를 다시 새 상자에 포장해서 서비스 계층으로 던집니다
  // 그래서 받는쪽(member.service)에서 다시 await를 해야함
}

export const findMember = async (projectId, memberId) => {
  const member = await prisma.projectMember.findUnique({
  where: {
    projectId_memberId : {
      projectId : projectId,
      memberId : memberId
    }
  },
  include : {
    _count : {
      select : { tasksAssigned : true}
    }
  }
})
console.log('member.repo에서 projectId, memberId에 일치하는 member :', member)
// 아직 초대 받지 못했다.
return member;
}
  // "_count": {          
  //   "tasksAssigned": 3 
  // }

export const findInvitations = (projectId, skip, take) => prisma.invitation.findMany({
  where: { projectId },
  include: {
    inviteeUser: true,
    projectMember: { include: { _count: { select: { tasksAssigned: true } } } }
  },
  skip, take, orderBy: { createdAt: 'desc' }
});

export const countInvitations = (projectId) => prisma.invitation.count({ where: { projectId } });

export const createInvitation = async (data) => {
  console.log('member.repo에서의 data :', data)
  // console.log('member.repo에서의 data.projectId :', data.projectId)
  // console.log('member.repo에서의 data.inviteeUserId :', data.inviteeUserId)
  const invitation = await prisma.invitation.create({ data });
  console.log('member.repo에서의 invitation :', invitation)
  return invitation
}

export const findInvitationById = async (id) => {
  console.log('member.repo에서의 invitationId :', id)
  const invitation = await prisma.invitation.findUnique({ 
  where: { id }, 
  include: { project: true } 
});
  console.log('member.repo에서의 invitation + project관련 data :', invitation)
  return invitation
}

// 1. invitaion테이블에서 PENDING -> ACCEPTED 
// 2. projectMember테이블에 role MEMBER로 데이터 추가
export const acceptInviteTransaction = async (invitationId, projectId, userId) => {
  const result = await prisma.$transaction([
  prisma.invitation.update({ 
    where: { id: invitationId }, 
    data: { status: "ACCEPTED" } 
  }),

  prisma.projectMember.create({ 
    data: { 
      projectId :projectId, 
      memberId: userId, 
      role: "MEMBER", 
      invitationId : invitationId } 
    })
]);
  console.log('member.repo에서의 result 트랜젝션 결과 :', result)
  return result;
}

export const deleteMember = (projectId, memberId) => prisma.projectMember.delete({
  where: { projectId_memberId: { projectId, memberId } }
});

export const deleteInvitation = (id) => prisma.invitation.delete({ where: { id } });