const express = require("express");
const router = express.Router();
const {
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent,
  getEventsByUserId,
  getEventReport,
  getFinancialReport,
  getAllEvents,
  getEventsByMode,
  getEventsByCategory,
  requestEventPublish,
  testEmail,
  getAdminUsers,
  getEventTransactions,
  checkEventConflict,
  getEventSocialMediaPosts,
  saveEventSocialMediaPost,
  deleteEventSocialMediaPost,
  uploadEditorImage,
} = require("../controllers/eventController");
const { sendPublishRequestNotification } = require("../services/emailService");

router.get("/all-events", getAllEvents);
router.get("/transactions", getEventTransactions);
router.get("/category", getEventsByCategory);

// Route to get events by user id (must be before /:id)
router.get("/user/:userId", getEventsByUserId);

// Test email endpoint
router.post("/test-email", testEmail);

// Get admin users for debugging
router.get("/admin-users", getAdminUsers);

// Reports should be defined before generic :id route
router.post('/check-conflict', checkEventConflict);
router.get("/:id/report", getEventReport);
router.get("/:id/financial-report", getFinancialReport);
router.post("/:id/request-publish", requestEventPublish);
// Social media posts routes
router.get("/:id/social-posts", getEventSocialMediaPosts);
router.post("/:id/social-posts", saveEventSocialMediaPost);
router.delete("/:id/social-posts", deleteEventSocialMediaPost);

// Editor image upload route (for TinyMCE)
router.post("/upload-editor-image", uploadEditorImage);
router.get("/:id", getEventById);
router.put("/:id", updateEvent);
router.delete("/:id", deleteEvent);
router.post("/", createEvent);
router.get("/", getEventsByMode);
module.exports = router;
