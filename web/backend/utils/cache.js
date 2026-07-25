const NodeCache = require('node-cache');

// Create a new cache instance with a default TTL of 1 hour
const cache = new NodeCache({ stdTTL: 3600 });

/**
 * Generate a cache key from messages array
 * @param {Array} messages - Array of message objects
 * @returns {string} Cache key
 */
function getCacheKey(messages) {
  return JSON.stringify(messages);
}

/**
 * Get cached response for messages
 * @param {Array} messages - Array of message objects
 * @returns {Object|null} Cached response or null if not found
 */
function getCachedResponse(messages) {
  const key = getCacheKey(messages);
  return cache.get(key);
}

/**
 * Cache a response for given messages
 * @param {Array} messages - Array of message objects
 * @param {Object} response - Response to cache
 * @param {number} [ttl] - Optional TTL in seconds
 */
function setCachedResponse(messages, response, ttl) {
  const key = getCacheKey(messages);
  cache.set(key, response, ttl);
}

module.exports = { getCachedResponse, setCachedResponse };
