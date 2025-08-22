import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import express from "express";
import { Server } from "socket.io";
import connectDB from "./config/database.js";
import SocketService from "./services/socketService.js";

// Import des routes
import authRoutes from "./routes/auth.js";
import taskRoutes from "./routes/tasks.js";

const app = express();
const server = app.listen(process.env.PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${process.env.PORT}`);
});

const corsOptions = {
  origin: process.env.CORS_ORIGIN,
  credentials: true,
};

const io = new Server(server, {
  cors: { ...corsOptions, methods: ["GET", "POST"] },
});

// Initialiser le service Socket.IO
const socketService = new SocketService(io);

// Rendre le socketService accessible aux contrôleurs
app.set("socketService", socketService);

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);

// Route 404
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route non trouvée",
  });
});

// Démarrer le serveur
const startServer = async () => {
  try {
    // Connecter à MongoDB
    await connectDB();
  } catch (error) {
    process.exit(1);
  }
};

startServer();
