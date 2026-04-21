// ============================================
// ভিডিও চ্যাট সিগন্যালিং সার্ভার
// ============================================

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

  // // 1. ইউজার ম্যাচ খুঁজছে
  // socket.on("find-match", () => {
  //   console.log(`🔍 User ${socket.id} is looking for a match`);

  //   if (waitingUsers.length > 0) {
  //     // আগের অপেক্ষমান ইউজারের সাথে ম্যাচ করুন
  //     const partner = waitingUsers.shift();
  //     const roomId = `room_${socket.id}_${partner.id}`;

  //     // দুই ইউজারকে একই রুমে যোগ দিন
  //     socket.join(roomId);
  //     partner.join(roomId);

  //     // দুইজনকে জানিয়ে দিন ম্যাচ পেয়েছে
  //     io.to(socket.id).emit("match-found", {
  //       roomId,
  //       partnerId: partner.id,
  //     });
  //     io.to(partner.id).emit("match-found", {
  //       roomId,
  //       partnerId: socket.id,
  //     });

  //     console.log(`✨ Matched: ${socket.id} with ${partner.id}`);
  //   } else {
  //     // কেউ না থাকলে অপেক্ষমান তালিকায় যোগ করুন
  //     waitingUsers.push(socket);
  //     socket.emit("waiting");
  //     console.log(`⏳ User ${socket.id} added to waiting queue`);
  //   }
  // });

  // 2. WebRTC Offer (কল শুরু করার সিগন্যাল)
  socket.on("offer", ({ offer, roomId }) => {
    console.log(`📡 Offer sent from ${socket.id} in room ${roomId}`);
    socket.to(roomId).emit("offer", { offer, from: socket.id });
  });

  // 3. WebRTC Answer (কল গ্রহণের সিগন্যাল)
  socket.on("answer", ({ answer, roomId }) => {
    console.log(`📡 Answer sent from ${socket.id} in room ${roomId}`);
    socket.to(roomId).emit("answer", { answer, from: socket.id });
  });

  // 4. ICE Candidate (নেটওয়ার্ক তথ্য বিনিময়)
  socket.on("ice-candidate", ({ candidate, roomId }) => {
    console.log(`❄️ ICE candidate from ${socket.id}`);
    socket.to(roomId).emit("ice-candidate", { candidate, from: socket.id });
  });

  // 5. ইউজার ডিসকানেক্ট
  socket.on("disconnect", () => {
    // অপেক্ষমান তালিকা থেকে সরিয়ে ফেলুন
    const index = waitingUsers.indexOf(socket);
    if (index !== -1) {
      waitingUsers.splice(index, 1);
      console.log(`❌ User ${socket.id} removed from waiting queue`);
    }
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
