import "dotenv/config";
import express from "express";
// import authRoutes from './routes/auth.js';
// import projectRoutes from './routes/projects.js';
// import invitationRoutes from './routes/invitations.js'
// import taskRoutes from './routes/tasks.js'
// import commentRoutes from './routes/comments.js';
// import userRoutes from './routes/user.js'
import authRouter from "./routers/auth.router.js";
import projectRouter from "./routers/project.router.js";
import memberRouter from "./routers/member.router.js"
import taskRouter from "./routers/task.router.js"
import cors from "cors";

const app = express();

app.use(express.json());

// 라우터 연결
app.use('/', taskRouter)
app.use("/auth", authRouter);
app.use("/projects", projectRouter);
app.use('/invitations', memberRouter)

// app.use('/tasks', taskRoutes)
// app.use('/comments', commentRoutes);
// app.use('/users', userRoutes)

app.use(cors({ origin: "http://localhost:3001", credentials: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
});
