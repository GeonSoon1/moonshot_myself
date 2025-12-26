import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

const router = express.Router();

// A가 truthy면 → A를 반환 , A가 falsy면 → B를 반환
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access_secret_key";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh_secret_key";

// [1] 회원가입 (POST /auth/register)
router.post("/register", async (req, res) => {
  const { email, password, name, profileImage } = req.body;

  try {
    // 1. 데이터 형식 체크 (400 Bad Request)
    if (!email || !password || !name) {
      return res.status(400).json({ message: "잘못된 데이터 형식" });
    }

    // 2. 이메일 중복 체크 (400 Bad Request)
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "이미 가입한 이메일입니다." });
    }

    // 3. 비밀번호 해싱 및 유저 생성
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        name,
        profileImage: profileImage || null,
        passwordHash: hashedPassword,
      },
    });

    // 4. 성공 응답 (201 Created) - 비밀번호 제외
    const { passwordHash, ...userWithoutPassword } = user;
    return res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "서버 내부 오류" });
  }
});

// [2] 로그인 (POST /auth/login)
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. 필수 입력 체크 (400)
    if (!email || !password) {
      //or(둘중에 하나라도 없으면) (&& 둘 다)
      return res.status(400).json({ message: "잘못된 요청입니다" });
    }

    // 2. 유저 존재 및 비밀번호 일치 확인 (404)
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return res
        .status(404)
        .json({ message: "존재하지 않거나 비밀번호가 일치하지 않습니다" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res
        .status(404)
        .json({ message: "존재하지 않거나 비밀번호가 일치하지 않습니다" });
    }

    // 3. 토큰 생성
    const accessToken = jwt.sign({ userId: user.id }, ACCESS_SECRET, {
      expiresIn: "1h",
    });
    const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, {
      expiresIn: "7d",
    });

    // 4. DB Session 테이블에 Refresh Token 저장 (해싱해서 저장) 보안을 위해
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await prisma.session.create({
      data: {
        refreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일 후
        userId: user.id,
      },
    });

    // 5. 성공 응답 (200 OK)
    return res.status(200).json({ accessToken, refreshToken });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "잘못된 요청입니다" });
  }
});

// [3] 토큰 갱신 (POST /auth/refresh)
router.post("/refresh", async (req, res) => {
  // console.log("req.headers 값 : ", req.headers);
//   req.headers 값 :  {
//   'user-agent': 'vscode-restclient',
//   authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc2NjcyNjA2MCwiZXhwIjoxNzY3MzMwODYwfQ.pmHjeVgX3mSsBS3J6eCavoPrm3fT6kWPfsqZkJ2b2As',
//   'content-type': 'application/json',
//   'accept-encoding': 'gzip, deflate',
//   host: 'localhost:3000',
//   connection: 'close',
//   'content-length': '0'
// }
  

  const authHeader = req.headers["authorization"];
  // console.log("authHeader 값 : ", authHeader);
  // authHeader 값 :  Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc2NjcyNjA2MCwiZXhwIjoxNzY3MzMwODYwfQ.pmHjeVgX3mSsBS3J6eCavoPrm3fT6kWPfsqZkJ2b2As

  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>
  // console.log('token 값 : ', token)
  // token 값 :  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc2NjcyNjA2MCwiZXhwIjoxNzY3MzMwODYwfQ.pmHjeVgX3mSsBS3J6eCavoPrm3fT6kWPfsqZkJ2b2As
  if (!token) {
    return res.status(400).json({ message: "잘못된 요청입니다" });
  }

  try {
    // 1. Refresh Token 검증
    const payload = jwt.verify(token, REFRESH_SECRET);
    // console.log('payload 값 : ', payload)
    // payload 값 :  { userId: 1, iat: 1766726060, exp: 1767330860 }

    // 2. DB에서 유효한 세션 찾기 (revokedAt이 null이고 만료 전인 것)
    const sessions = await prisma.session.findMany({
      where: {
        userId: payload.userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    // console.log('sessions 값 : ', sessions)
//     sessions 값 :  [
//   {
//     id: 3,
//     refreshTokenHash: '$2b$10$JbxXTOV0P90OVFmGJbDGxeccggnLs.rs7MjaY7T431oALiEIBo9jK',
//     expiresAt: 2026-01-02T07:31:55.715Z,
//     revokedAt: null,
//     userId: 1,
//     createdAt: 2025-12-26T07:31:55.716Z,
//     updatedAt: 2025-12-26T07:31:55.716Z
//   }
// ]


    // 실제 전달받은 토큰과 DB에 저장된 해시값이 일치하는 세션 찾기
    let validSession = null;
    for (const s of sessions) {
      const isMatch = await bcrypt.compare(token, s.refreshTokenHash);
      if (isMatch) {
        validSession = s;
        break;
      }
    }

    if (!validSession) {
      return res.status(401).json({ message: "토큰 만료" });
    }

    // 3. 신규 토큰 생성 (Token Rotation)
    const newAccessToken = jwt.sign({ userId: payload.userId }, ACCESS_SECRET, {
      expiresIn: "1h",
    });
    const newRefreshToken = jwt.sign(
      { userId: payload.userId },
      REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // 4. 기존 세션 폐기 및 신규 세션 등록
    await prisma.session.update({
      where: { id: validSession.id },
      data: { revokedAt: new Date() }, // 기존 세션 사용 중지
    });

    const newRefreshHash = await bcrypt.hash(newRefreshToken, 10);
    await prisma.session.create({
      data: {
        refreshTokenHash: newRefreshHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userId: payload.userId,
      },
    });

    return res
      .status(200)
      .json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    return res.status(401).json({ message: "토큰 만료" });
  }
});

export default router;
