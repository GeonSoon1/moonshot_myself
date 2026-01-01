export const acceptInviteTransaction = async (invitationId, projectId, userId) => {
  const result = await prisma.$transaction([
  prisma.invitation.update({ where: { id: invitationId }, data: { status: "ACCEPTED" } }),
  prisma.projectMember.create({ data: { projectId, memberId: userId, role: "MEMBER", invitationId } })
]);
  console.log('member.repo에서의 result 트랜젝션 결과 :', result)
  return result;
}


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


