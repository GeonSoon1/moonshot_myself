import 'dotenv/config';
import express from 'express';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import invitationRoutes from './routes/invitations.js'
import taskRoutes from './routes/tasks.js'
import commentRoutes from './routes/comments.js';
import userRoutes from './routes/user.js'
import cors from 'cors';

const app = express();

app.use(express.json());


// 라우터 연결
app.use('/auth', authRoutes);
app.use('/projects', projectRoutes);
app.use('/invitations', invitationRoutes)
app.use('/tasks', taskRoutes)
app.use('/comments', commentRoutes);
app.use('/users', userRoutes)
app.use(cors({ origin: 'http://localhost:3001', credentials: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
});