import { CLIENT_URL, GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI } from '../../libs/contants';
import { AuthRepo } from './auth.repo';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';

class AuthController {
  constructor(service) {}

  async register(req, res) {
    const user = await this.service.register(req.body);
    res.status(201).json(user);
  }

  async login(req, res) {
    const { email, password } = req.body;
    const user = await this.service.getUser(email, password);

    const accessToken = await this.service.generateToken(user.id);
    const refreshToken = await this.service.generateToken(user.id, 'refresh');

    res.json({ accessToken, refreshToken });
  }

  async refresh(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: '토큰 만료' });
    }

    const refreshToken = authHeader.split(' ')[1];

    const tokens = await this.service.refresh(refreshToken);
    res.status(200).json(tokens);
  }

  async googleLogin(req, res) {
    const redirectUrl =
      'https://accounts.google.com/o/oauth2/v2/auth' +
      `?client_id=${GOOGLE_CLIENT_ID}` +
      `&redirect_uri=${GOOGLE_REDIRECT_URI}` +
      `&response_type=code` +
      `&scope=openid%20email%20profile` +
      `&access_type=offline` + // refresh token 요청
      `&prompt=consent`; // 매번 consent 화면

    res.redirect(redirectUrl);
  }

  async googleCallback(req, res) {
    try {
      const { code } = req.query;
      if (!code) throw new Error('No code');

      const result = await this.service.googleLogin(code);

      res.redirect(`${CLIENT_URL}?access=${result.accessToken}&refresh=${result.refreshToken}`);
    } catch (e) {
      console.error('GOOGLE CALLBACK ERROR:', e);
      res.status(401).json({ message: 'Google login failed' });
    }
  }
}

const authRepo = new AuthRepo();
const authService = new AuthService(authRepo);
const authController = new AuthController(authService);

export default authController;