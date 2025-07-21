const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const sortParam = req.query.sort === 'desc' ? -1 : 1;
    const me = await User.findById(req.user.userId).select('role name online');
    const other = await User.findById(userId).select('role name online');
    if (!other) return res.status(404).json({ msg: 'User not found' });
    if (me.role === other.role) return res.status(403).json({ msg: 'Chat allowed only between fan and player.' });
    const messages = await Message.find({
      $or: [
        { senderId: req.user.userId, receiverId: userId },
        { senderId: userId, receiverId: req.user.userId }
      ]
    }).sort({ timestamp: sortParam }).lean();
    res.json({ otherUser: other, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/send', authMiddleware, async (req, res) => {
  try {
    const { receiverId, message } = req.body;
    if (!receiverId || !message) {
      return res.status(400).json({ msg: 'Receiver ID and message are required.' });
    }

    const sender = await User.findById(req.user.userId);
    const receiver = await User.findById(receiverId);
    if (!receiver) return res.status(404).json({ msg: 'Receiver not found.' });

    // Check roles (fan ↔ player only)
    if (sender.role === receiver.role) {
      return res.status(403).json({ msg: 'Chat allowed only between fan and player.' });
    }

    // Save the message
    const newMessage = await Message.create({
      senderId: sender._id,
      receiverId,
      message
    });

    // Emit message if receiver is online
    req.app.get('io').to(receiverId.toString()).emit('receiveMessage', newMessage);

    res.json(newMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
