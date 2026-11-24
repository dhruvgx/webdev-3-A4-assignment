// EXTENDED backend (extra features). The original server.js is left UNCHANGED.
// Keeps every original event (active, chat, join, announce, msg) and adds:
// usernames, real message relay, personal rooms (optional password), member list, typing.
// Run:  node server-rooms.js   ->  open http://localhost:8080
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const httpserver = http.createServer(app);
const io = new Server(httpserver);

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "client.html")));

let count = 0;
const rooms = new Map([["lobby", { name: "lobby", password: null, history: [] }]]);
const key = (r) => "room:" + r;
const clean = (s, n) => String(s || "").trim().slice(0, n);

function roomList() {
  return [...rooms.values()].map((r) => ({
    name: r.name,
    locked: !!r.password,
    members: io.sockets.adapter.rooms.get(key(r.name))?.size || 0,
  }));
}
function members(room) {
  const ids = io.sockets.adapter.rooms.get(key(room)) || new Set();
  return [...ids].map((id) => io.sockets.sockets.get(id)?.data.name).filter(Boolean);
}
function leave(socket) {
  const room = socket.data.room;
  if (!room) return;
  socket.leave(key(room));
  socket.data.room = null;
  io.to(key(room)).emit("room:notice", `${socket.data.name} left`);
  io.to(key(room)).emit("room:members", members(room));
  if (rooms.has(room) && room !== "lobby" && members(room).length === 0) rooms.delete(room);
  io.emit("rooms:list", roomList());
}
function enter(socket, room) {
  leave(socket);
  socket.join(key(room));
  socket.data.room = room;
  socket.to(key(room)).emit("room:notice", `${socket.data.name} joined`);
  io.to(key(room)).emit("room:members", members(room));
  io.emit("rooms:list", roomList());
}

io.on("connection", (socket) => {
  count++;
  socket.data.name = "Guest" + Math.floor(Math.random() * 9000 + 1000);
  socket.data.room = null;
  console.log("Active User: ", count);
  io.emit("active", count); // now updates for everyone
  socket.emit("chat", "Hello from server side");
  socket.broadcast.emit("join", "New User Joined");
  io.emit("announce", "Only 5hr class left");
  socket.emit("rooms:list", roomList());

  socket.on("msg", (cb) => console.log(cb)); // original handler

  socket.on("user:name", (name, ack) => {
    socket.data.name = clean(name, 20) || socket.data.name;
    ack && ack({ ok: true, name: socket.data.name });
  });

  socket.on("room:create", ({ room, password } = {}, ack) => {
    room = clean(room, 24).toLowerCase().replace(/\s+/g, "-");
    if (!room) return ack && ack({ ok: false, error: "Room name required" });
    if (rooms.has(room)) return ack && ack({ ok: false, error: "Room already exists" });
    rooms.set(room, { name: room, password: clean(password, 30) || null, history: [] });
    enter(socket, room);
    ack && ack({ ok: true, room, history: [] });
  });

  socket.on("room:join", ({ room, password } = {}, ack) => {
    const r = rooms.get(clean(room, 24).toLowerCase());
    if (!r) return ack && ack({ ok: false, error: "Room not found" });
    if (r.password && r.password !== clean(password, 30))
      return ack && ack({ ok: false, error: "Wrong password" });
    enter(socket, r.name);
    ack && ack({ ok: true, room: r.name, history: r.history });
  });

  socket.on("room:message", (text) => {
    const room = socket.data.room;
    text = clean(text, 1000);
    if (!room || !text) return;
    const m = { user: socket.data.name, text, ts: Date.now(), id: socket.id };
    const r = rooms.get(room);
    r.history.push(m);
    if (r.history.length > 50) r.history.shift();
    io.to(key(room)).emit("room:message", m);
  });

  socket.on("typing", (on) => {
    if (socket.data.room)
      socket.to(key(socket.data.room)).emit("typing", { user: socket.data.name, on: !!on });
  });

  socket.on("disconnect", () => {
    leave(socket);
    count--;
    console.log("Active User: ", count);
    io.emit("active", count);
  });
});

httpserver.listen(8080, () => console.log("Server (rooms) started on http://localhost:8080"));
