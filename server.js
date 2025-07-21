require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const connectDB = require('./config/db');
const User = require('./models/User');
const Message = require('./models/Message');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/chat', require('./routes/chat'));

connectDB();

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.set('io', io);
const userConnections = new Map(); // userId -> active socket count


io.use((socket, next) => {
  try {
    let token = socket.handshake.auth?.token;
    if (!token && socket.handshake.headers?.authorization) {
      const parts = socket.handshake.headers.authorization.split(' ');
      if (parts[0] === 'Bearer') token = parts[1];
    }
    if (!token) return next(new Error('No auth token'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.role = decoded.role;
    return next();
  } catch (err) {
    return next(new Error('Invalid token'));
  }
});

io.on('connection', async (socket) => {
  console.log('Socket connected:', socket.id, 'user:', socket.userId);
  await User.findByIdAndUpdate(socket.userId, { online: true });
  socket.join(socket.userId.toString());
const current = userConnections.get(socket.userId) || 0;
userConnections.set(socket.userId, current + 1);

// If this is the first connection, mark the user online in DB
if (current === 0) {
  await User.findByIdAndUpdate(socket.userId, { online: true });
  io.emit('userPresence', { userId: socket.userId, online: true });
}

  io.emit('userPresence', { userId: socket.userId, online: true });

  socket.on('privateMessage', async ({ receiverId, message }) => {
    try {
      if (!receiverId || !message?.trim()) return;
      const receiver = await User.findById(receiverId);
      if (!receiver) return;
      if (socket.role === receiver.role) {
        socket.emit('chatError', { msg: 'Chat allowed only between fan and player.' });
        return;
      }
      const newMessage = await Message.create({
        senderId: socket.userId,
        receiverId,
        message: message.trim()
      });
      io.to(socket.userId.toString()).emit('receiveMessage', newMessage);
      io.to(receiverId.toString()).emit('receiveMessage', newMessage);

      console.log(`Message from ${socket.userId} to ${receiverId}: ${message}`);  // <-- Add this line

    } catch (err) {
      console.error('privateMessage error:', err);
      socket.emit('chatError', { msg: 'Message send failed.' });
    }
  });

  socket.on('disconnect', async () => {
    console.log('Socket disconnected:', socket.id, 'user:', socket.userId);

    
      // Decrement user's connection count
      const current = userConnections.get(socket.userId) || 1;
      if (current <= 1) {
        userConnections.delete(socket.userId);
        await User.findByIdAndUpdate(socket.userId, { online: false });
        io.emit('userPresence', { userId: socket.userId, online: false });
      } else {
        userConnections.set(socket.userId, current - 1);
      }
    });
    
    if (socket.userId) {
      await User.findByIdAndUpdate(socket.userId, { online: false });
      io.emit('userPresence', { userId: socket.userId, online: false });
    }
  });


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
