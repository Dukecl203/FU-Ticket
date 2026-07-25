const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const compression = require("compression");
const http = require("http"); // 🔹 thêm
const { Server } = require("socket.io"); // 🔹 thêm

dotenv.config();

const app = express();
const port = process.env.PORT || 9999;

// ----------------- MongoDB -----------------
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("✅ DB connected"))
  .catch((err) => console.error("❌ DB connection error:", err));

// ----------------- Middleware -----------------
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173",
      "https://ticketfu-font-end.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use(
  compression({
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
    level: 6,
  })
);

// ----------------- Routes -----------------
const apiRoutes = require("./routes/index");
app.use("/api", apiRoutes);

const loginRouter = require("./routes/loginRouter");
app.use("/api", loginRouter);

const notificationRouter = require("./routes/notificationRouter");
// Mount notifications under /api/notifications
app.use("/api/notifications", notificationRouter);

// ----------------- Socket.io -----------------
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://ticketfu-font-end.vercel.app",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// 🔹 Gán vào app để controller dùng
app.set("io", io);

// ----------------- Event Status Monitor -----------------
const { startEventStatusMonitor } = require("./services/eventStatusMonitor");
startEventStatusMonitor(io);

// Socket.io events
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // ------------------------
  // Notification
  socket.on("send_notification", (data) => {
    // data = { userId, message }
    io.to(data.userId).emit("receive_notification", data);
  });

  // ------------------------
  // Event Status Updates
  // Join event room to receive status updates for specific event
  socket.on("join_event_room", (eventId) => {
    socket.join(`event_${eventId}`);
    console.log(`User ${socket.id} joined event room: event_${eventId}`);
  });

  // Leave event room
  socket.on("leave_event_room", (eventId) => {
    socket.leave(`event_${eventId}`);
    console.log(`User ${socket.id} left event room: event_${eventId}`);
  });
  socket.on("join_user_room", (userId) => {
    socket.join(userId); // Sử dụng userId làm tên phòng để gửi thông báo riêng
    console.log(`User ${socket.id} joined user room: ${userId}`);
  });
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${port}`);
});

module.exports = { app, io };
