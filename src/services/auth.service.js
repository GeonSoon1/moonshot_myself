import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import * as authRepo from "../repositories/auth.repo.js";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access_secret_key";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh_secret_key";

// [헬퍼] 토큰 세트 생성
const generateTokenSet = (userId) => {
  const accessToken = jwt.sign({ userId }, ACCESS_SECRET, { expiresIn: "3d" });
  const refreshToken = jwt.sign({ userId }, REFRESH_SECRET, {
    expiresIn: "7d",
  });
  return { accessToken, refreshToken };
};

// [회원가입 로직]
export const signup = async ({ email, password, name, profileImage }) => {
  const existing = await authRepo.findUserByEmail(email);
  if (existing) throw { status: 400, message: "이미 가입한 이메일입니다." };

  const hashedPassword = await bcrypt.hash(password, 10);
  return await authRepo.createUser({
    email,
    name,
    profileImage: profileImage || null,
    passwordHash: hashedPassword,
  });
};

// [로그인 로직]
export const signin = async (email, password) => {
  const user = await authRepo.findUserByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw {
      status: 404,
      message: "존재하지 않거나 비밀번호가 일치하지 않습니다",
    };
  }

  const tokens = generateTokenSet(user.id);

  // Refresh Token 해싱 후 DB 저장
  const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
  await authRepo.createSession({
    refreshTokenHash,
    userId: user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일 후
  });

  return tokens;
};

// [토큰 갱신 로직]
export const rotateToken = async (refreshToken) => {
  // 1. 토큰 자체 검증
  const payload = jwt.verify(refreshToken, REFRESH_SECRET);

  // 2. DB에서 해당 유저의 세션들 확인
  const sessions = await authRepo.findActiveSessionsByUserId(payload.userId);

  // 3. 전달받은 토큰과 DB 해시값 대조
  let validSession = null;
  for (const s of sessions) {
    if (await bcrypt.compare(refreshToken, s.refreshTokenHash)) {
      validSession = s;
      break;
    }
  }

  if (!validSession) throw { status: 401, message: "토큰 만료" };

  // 4. 기존 세션 폐기 및 새 토큰/세션 생성 (Rotation)
  await authRepo.updateSession(validSession.id, { revokedAt: new Date() });

  const newTokens = generateTokenSet(payload.userId);
  const newHash = await bcrypt.hash(newTokens.refreshToken, 10);

  await authRepo.createSession({
    refreshTokenHash: newHash,
    userId: payload.userId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return newTokens;
};
