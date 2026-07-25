const rateLimit = require('express-rate-limit');

// Rate limiting middleware for AI endpoints
const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { aiRateLimiter };
