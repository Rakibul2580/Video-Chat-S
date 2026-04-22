const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"], // গুরুত্বপূর্ণ
});

let waitingUser = null;

io.on("connection", (socket) => {
  console.log(`🟢 User connected: ${socket.id}`);

  socket.on("find-match", () => {
    if (waitingUser) {
      const roomId = `room_${socket.id}_${waitingUser.id}`;
      socket.join(roomId);
      waitingUser.join(roomId);

      // দুজনকে ম্যাচ ফাউন্ড ইভেন্টে partnerId পাঠানো হচ্ছে
      socket.emit("match-found", { roomId, partnerId: waitingUser.id });
      waitingUser.emit("match-found", { roomId, partnerId: socket.id });

      waitingUser = null;
      console.log(`✨ Matched ${socket.id} with ${waitingUser?.id}`);
    } else {
      waitingUser = socket;
      socket.emit("waiting");
      console.log(`⏳ ${socket.id} is waiting`);
    }
  });

  socket.on("offer", ({ offer, roomId }) => {
    socket.to(roomId).emit("offer", { offer, roomId });
  });

  socket.on("answer", ({ answer, roomId }) => {
    socket.to(roomId).emit("answer", { answer });
  });

  socket.on("ice-candidate", ({ candidate, roomId }) => {
    socket.to(roomId).emit("ice-candidate", { candidate });
  });

  socket.on("disconnect", () => {
    if (waitingUser === socket) {
      waitingUser = null;
    }
    console.log(`🔴 User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
