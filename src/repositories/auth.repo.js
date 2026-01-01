import prisma from "../lib/prismaClient.js";

// 이메일로 유저 찾기
export const findUserByEmail = async (email) => {
  return await prisma.user.findUnique({ where: { email } });
};

// 새 유저 생성
export const createUser = async (data) => {
  return await prisma.user.create({ data });
};

// 세션(Refresh Token Hash) 저장
export const createSession = async (data) => {
  return await prisma.session.create({ data });
};

// 유저의 유효한 세션들 조회
export const findActiveSessionsByUserId = async (userId) => {
  return await prisma.session.findMany({
    where: { 
      userId, 
      revokedAt: null, 
      expiresAt: { gt: new Date() } 
    },
  });
};

// 세션 상태 업데이트 (폐기 등)
export const updateSession = async (sessionId, data) => {
  return await prisma.session.update({
    where: { id: sessionId },
    data,
  });
};