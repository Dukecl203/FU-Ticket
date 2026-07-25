const express = require("express");
const router = express.Router();
const { verifyOrganizer } = require("../middleware/auth");
const {
    getOAuthUrls,
    postToSocialMedia,
    getSocialMediaStats,
    mockConnect,
    facebookCallback,
    checkConnectionStatus,
    dataDeletionCallback
} = require("../controllers/socialMediaController");

// Get OAuth URLs for social media platforms
router.get("/oauth-urls", verifyOrganizer, getOAuthUrls);

// Check connection status
router.get("/connection-status", verifyOrganizer, checkConnectionStatus);

// Mock connection route for development
router.get("/mock-connect", mockConnect);

// Real Facebook OAuth callback
router.get("/facebook/callback", facebookCallback);

// Data deletion callback (required by Facebook)
router.post("/facebook/data-deletion", dataDeletionCallback);
router.get("/facebook/data-deletion", dataDeletionCallback);

// Social media posting
router.post("/post", verifyOrganizer, postToSocialMedia);

// Get social media statistics
router.get("/stats", verifyOrganizer, getSocialMediaStats);

module.exports = router;