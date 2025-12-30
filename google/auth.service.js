import jwt, { SignOptions } from 'jsonwebtoken';
import { AuthRepo } from './auth.repo';
import { CreateUserDTO } from './dto/auth.dto';
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  JWT_SECRET,
} from '../../libs/contants';
import axios from 'axios';
import qs from 'qs'; // npm install qs

export class AuthService {
  constructor(private repo: AuthRepo) {}
  async register(data: CreateUserDTO) {
    const user = await this.repo.createUser(data);
    return user;
  }

  async getUser(email: string, password: string) {
    const user = await this.repo.findUserByEmailAndPassword(email, password);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    return user;
  }

  async generateToken(userId: number, type: 'access' | 'refresh' = 'access') {
    const payload = { userId };
    const options: SignOptions = { expiresIn: type === 'access' ? '1h' : '7d' };
    const token = jwt.sign(payload, JWT_SECRET, options);
    return token;
  }

  async refresh(refreshToken: string) {
    let payload: any;

    try {
      payload = jwt.verify(refreshToken, JWT_SECRET);
    } catch {
      throw new Error('jwt.verift 에러');
    }

    // payload에는 userId만 있음
    const { userId } = payload;

    const accessToken = this.generateToken(userId, 'access');
    const newRefreshToken = this.generateToken(userId, 'refresh');

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async googleLogin(code: string) {
    const { access_token, refresh_token, expires_in, id_token } = await this.getGoogleAccessToken(
      code,
    );
    const decoded = jwt.decode(id_token); //id_token에서 디코딩해서 유저정보 사용가능
    const googleUser = await this.getGoogleUser(access_token); // access token에서 요청해서 유저정보 사용가능
    const user = await this.repo.findOrCreateGoogleUser({
      email: googleUser.email,
      name: googleUser.name,
      profileImgUrl: googleUser.picture,
      providerId: googleUser.sub,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: new Date(Date.now() + expires_in * 1000),
    });

    return this.issueTokens(user.id);
  }

  private async getGoogleAccessToken(code: string) {
    const res = await axios.post(
      'https://oauth2.googleapis.com/token',
      qs.stringify({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    return res.data;
  }

  private async getGoogleUser(accessToken: string) {
    const { data } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return data;
  }

  private issueTokens(userId: number) {
    return {
      accessToken: jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' }),
      refreshToken: jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' }),
    };
  }
}