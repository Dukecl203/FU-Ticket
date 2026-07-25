const express = require("express");
const router = express.Router();
const {
    searchUsers,
    getEventCollaborators,
    getUserCollaborations,
    addCollaboratorToEvent,
    removeCollaboratorFromEvent,
    updateCollaboratorStatus,
    updateCollaborationStatusByEvent,
} = require("../controllers/collaboratorController");
const { verifyToken } = require("../middleware/auth");

// Search users by user_id
router.get("/search", searchUsers);

// Get collaborators for a specific event
router.get("/event/:eventId", getEventCollaborators);

// Get collaborations for a specific user
router.get("/user/:userId", getUserCollaborations);

// Add collaborator to event
router.post("/event/:eventId", addCollaboratorToEvent);

// Remove collaborator from event
router.delete("/event/:eventId/collaborator/:collaboratorId", removeCollaboratorFromEvent);

// Update collaborator status
router.put("/event/:eventId/collaborator/:collaboratorId", updateCollaboratorStatus);

// Update collaboration status by event (for users to accept/cancel their participation)
router.put("/events/:eventId/status", verifyToken, updateCollaborationStatusByEvent);

module.exports = router;
