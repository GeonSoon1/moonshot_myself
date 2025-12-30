import { prisma } from '../../libs/prisma-client';
import { CreateUserDTO } from './dto/auth.dto';

export class AuthRepo {
  /**
   * 일반 회원가입
   */
  async createUser(data: CreateUserDTO) {
    const { id, email, name, profileImgUrl, createdAt, updatedAt } = await prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        name: data.name!,
        profileImgUrl: data.profileImage || 'null',
      },
    });
    const user = { id, email, name, createdAt, updatedAt };
    return { ...user, profileImage: profileImgUrl };
  }

  /**
   * 이메일 + 패스워드 로그인용
   */
  async findUserByEmailAndPassword(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user || user.password !== password) return null;
    return user;
  }

  async findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  /**
   * 구글 로그인 시 사용자 생성 or 조회
   */
  async findOrCreateGoogleUser(data: {
    email: string;
    name: string;
    profileImgUrl: string;
    providerId: string;
    accessToken: string;
    refreshToken?: string; // 옵셔널
    expiresAt: Date;
  }) {
    const user = await this.findUserByEmail(data.email);

    const oauthData: any = {
      provider: 'google',
      providerId: data.providerId,
      accessToken: data.accessToken,
      expirationAt: data.expiresAt,
    };

    if (data.refreshToken) oauthData.refreshToken = data.refreshToken;

    if (!user) {
      // 신규 유저 + OAuth 생성
      return prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          profileImgUrl: data.profileImgUrl,
          oauths: { create: oauthData },
        },
        include: { oauths: true },
      });
    }

    // 기존 유저 → OAuth 정보만 upsert
    await prisma.oauth.upsert({
      where: {
        provider_providerId: {
          provider: 'google',
          providerId: data.providerId,
        },
      },
      update: oauthData,
      create: { userId: user.id, ...oauthData },
    });

    return user;
  }
}