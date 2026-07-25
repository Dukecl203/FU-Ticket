// routes/notifications.js
const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authMiddleware: auth } = require('../middleware/auth');

// GET /api/notifications?limit=50
router.get('/', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
    const items = await Notification
      .find({ user_id: req.user._id || req.user.id })
      .sort({ created_at: -1 })
      .limit(limit)
      .lean();
    res.json({ items, success: true });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/notifications/unread - lấy thông báo chưa đọc
router.get('/unread/count', auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user_id: req.user._id || req.user.id,
      read: false
    });
    res.json({ count, success: true });
  } catch (error) {
    console.error("Error counting unread notifications:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/notifications
router.post('/', auth, async (req, res) => {
  try {
    const { title, body, href, type = "GENERAL" } = req.body || {};
    if (!title) return res.status(400).json({ message: 'title is required' });

    const doc = await Notification.create({
      user_id: req.user._id || req.user.id,
      title,
      body: body || '',
      type,
      read: false,
    });
    res.status(201).json({ ...doc.toObject(), success: true });
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/notifications/:id  { read: true/false }
router.patch('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { read } = req.body || {};
    const updated = await Notification.findOneAndUpdate(
      { _id: id, user_id: req.user._id || req.user.id },
      { $set: { read: !!read, status: !!read ? "READ" : "UNREAD" } },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json({ ...updated, success: true });
  } catch (error) {
    console.error("Error updating notification:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/notifications/read-all
router.post('/read-all', auth, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user_id: req.user._id || req.user.id, read: { $ne: true } },
      { $set: { read: true, status: "READ" } }
    );
    res.json({ updated: result.modifiedCount || 0, success: true });
  } catch (error) {
    console.error("Error marking all as read:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/notifications
router.delete('/', auth, async (req, res) => {
  try {
    await Notification.deleteMany({ user_id: req.user._id || req.user.id });
    res.status(204).end();
  } catch (error) {
    console.error("Error deleting notifications:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Notification.findOneAndDelete(
      { _id: id, user_id: req.user._id || req.user.id }
    );
    if (!result) return res.status(404).json({ message: 'Not found' });
    res.status(204).end();
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DEV-only debug route: GET /api/notifications/debug/latest?userId=&limit=
router.get('/debug/latest', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ success: false, message: 'Debug endpoint disabled in production' });
    }

    const { userId, limit = 20 } = req.query;
    if (!userId) return res.status(400).json({ success: false, message: 'userId query param required' });

    const items = await Notification.find({ user_id: userId })
      .sort({ created_at: -1 })
      .limit(Math.min(Number(limit) || 20, 200))
      .lean();

    res.json({ success: true, items });
  } catch (error) {
    console.error('Error in debug/latest:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;