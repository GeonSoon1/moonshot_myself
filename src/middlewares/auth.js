import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret_key';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc2NjcyNjA2MCwiZXhwIjoxNzY3MzMwODYwfQ.pmHjeVgX3mSsBS3J6eCavoPrm3fT6kWPfsqZkJ2b2As
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
  // eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc2NjcyNjA2MCwiZXhwIjoxNzY3MzMwODYwfQ.pmHjeVgX3mSsBS3J6eCavoPrm3fT6kWPfsqZkJ2b2As
  
  if (!token) {
    return res.status(401).json({ message: "인증이 필요합니다." });
  }

  jwt.verify(token, ACCESS_SECRET, (err, payload) => {
    if (err) {
      return res.status(403).json({ message: "유효하지 않은 토큰입니다." });
    }
    
    // 토큰에 담긴 userId를 req 객체에 넣어 다음 로직에서 쓸 수 있게 합니다.
    req.userId = payload.userId;
    next();
  });
};