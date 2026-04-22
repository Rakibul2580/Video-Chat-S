const express = require("express");

const http = require("http");

const socketIo = require("socket.io");

const cors = require("cors");

const dotenv = require("dotenv");

// কনফিগারেশন লোড করুন

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

const CLIENT_URL = process.env.CLIENT_URL || "https://fanfun.xyz"; // 🔴 প্রোডাকশনে এই লিংকটি পরিবর্তন করুন

// মিডলওয়্যার

app.use(cors());

app.use(express.json());

// হেলথ চেক এন্ডপয়েন্ট (API লিংক: http://your-server.com/health)

app.get("/", (req, res) => {
  res.json({ status: "Server is running", timestamp: new Date() });
});

// HTTP সার্ভার তৈরি

const server = http.createServer(app);

// Socket.io সেটআপ

// 🔴 প্রোডাকশনে নিচের 'cors.origin' এ আপনার ফ্রন্টএন্ডের ঠিকানা দিন:

//    উদাহরণ: "https://your-domain.com" (amarhost.com এর ঠিকানা)

const io = socketIo(server, {
  cors: {
    origin: CLIENT_URL, // 🔴 এই লিংকটি পরিবর্তন করতে হবে

    methods: ["GET", "POST"],

    credentials: true,
  },
});

// অপেক্ষমান ইউজারের কিউ

let waitingUsers = [];

// ============================================

// সকেট ইভেন্ট হ্যান্ডলার

// ============================================

io.on("connection", (socket) => {
  console.log(`✅ New user connected: ${socket.id}`);

  socket.on("find-match", () => {
    if (waitingUsers.length > 0) {
      const partner = waitingUsers.shift();

      const roomId = `room_${socket.id}_${partner.id}`;

      socket.join(roomId);
      partner.join(roomId);

      // 🔥 ALWAYS send BOTH sides clearly
      socket.emit("match-found", {
        roomId,
        partnerId: partner.id,
        isInitiator: true,
      });

      partner.emit("match-found", {
        roomId,
        partnerId: socket.id,
        isInitiator: false,
      });
    } else {
      waitingUsers.push(socket);
      socket.emit("waiting");
    }
  });

  // 🔴 নতুন: সব signaling এর জন্য একটা generic event
  socket.on("send-signal", ({ signal, roomId }) => {
    console.log(`📡 Signal from ${socket.id} in room ${roomId}`);
    socket.to(roomId).emit("receive-signal", { signal, from: socket.id });
  });

  // ডিসকানেক্ট
  socket.on("disconnect", () => {
    const index = waitingUsers.indexOf(socket);
    if (index !== -1) waitingUsers.splice(index, 1);
    console.log(`👋 User disconnected: ${socket.id}`);
  });
});

// সার্ভার চালু করুন

server.listen(PORT, () => {
  console.log(`

  ========================================

  🚀 Video Chat Server is running!

  ========================================

  📡 Port: ${PORT}

  🌐 Client URL: ${CLIENT_URL}

  🔗 Health check: http://localhost:${PORT}/health

  ========================================

  `);
});
