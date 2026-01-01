import * as authService from "../services/auth.service.js";

export const register = async (req, res) => {
  try {
    const user = await authService.signup(req.body);
    const { passwordHash, ...result } = user;
    return res.status(201).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "잘못된 요청입니다" });

    const tokens = await authService.signin(email, password);
    return res.status(200).json(tokens);
  } catch (error) {
    return res.status(error.status || 400).json({ message: error.message });
  }
};

export const refresh = async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(400).json({ message: "잘못된 요청입니다" });

    const newTokens = await authService.rotateToken(token);
    return res.status(200).json(newTokens);
  } catch (error) {
    return res.status(401).json({ message: "토큰 만료" });
  }
};