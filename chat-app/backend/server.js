const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let messages = [];
let onlineUsers = {}; // { socketId: name }

app.get("/messages", (req, res) => res.json(messages));

io.on("connection", (socket) => {
  console.log("✅ Connected:", socket.id);

  // User joins with their chosen name
  socket.on("user_join", ({ name }) => {
    onlineUsers[socket.id] = name;
    // Broadcast updated list to ALL clients including sender
    io.emit("online_users", Object.values(onlineUsers));
    console.log("Online users:", Object.values(onlineUsers));
  });

  // Client asking for current list (backup in case they missed it)
  socket.on("request_online_users", () => {
    socket.emit("online_users", Object.values(onlineUsers));
  });

  socket.on("send_message", (msg) => {
    const newMsg = { id: Date.now(), ...msg };
    messages.push(newMsg);
    io.emit("new_message", newMsg);
  });

  socket.on("typing", ({ name }) => {
    socket.broadcast.emit("user_typing", { name });
  });

  socket.on("stop_typing", ({ name }) => {
    socket.broadcast.emit("user_stopped_typing", { name });
  });

  socket.on("user_leave", ({ name }) => {
    delete onlineUsers[socket.id];
    io.emit("online_users", Object.values(onlineUsers));
  });

  socket.on("disconnect", () => {
    delete onlineUsers[socket.id];
    io.emit("online_users", Object.values(onlineUsers));
    console.log("❌ Disconnected:", socket.id);
  });
});

server.listen(5000, () => {
  console.log("🚀 Server running at http://localhost:5000");
});