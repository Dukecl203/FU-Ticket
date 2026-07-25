const { verifyToken } = require('../lib/jwt');

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    console.log('Auth header:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      });
    }

    // Verify token
    const token = authHeader.split(' ')[1];
    console.log('Token received:', token ? `${token.substring(0, 15)}...` : 'none');

    try {
      // Add extra error handling for JWT verification
      try {
        const decoded = verifyToken(token);
        console.log('Decoded token:', decoded);

        // Add user from payload
        req.user = decoded;
        if (req.user && typeof req.user.role === 'string') {
          req.user.role = req.user.role.toLowerCase();
        }
        // Backward compatibility: ensure _id and id exist when token has userId
        if (req.user && req.user.userId && !req.user._id) {
          req.user._id = req.user.userId;
        }
        if (req.user && req.user.userId && !req.user.id) {
          req.user.id = req.user.userId;
        }
        
        // Check if token is expired
        const currentTime = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp < currentTime) {
          return res.status(401).json({
            success: false,
            message: 'Token has expired'
          });
        }
        
        next();
      } catch (jwtError) {
        if (jwtError.name === 'JsonWebTokenError') {
          return res.status(401).json({
            success: false,
            message: 'Invalid token format'
          });
        } else if (jwtError.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            message: 'Token has expired'
          });
        } else {
          throw jwtError; // Let it be caught by the outer catch block
        }
      }
    } catch (error) {
      console.error('Token verification error:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Token is not valid'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * Role-based authorization middleware
 * @param {Array} roles - Array of allowed roles
 */
const authorizeRoles = (...roles) => {
  const allowed = roles.map(r => (typeof r === 'string' ? r.toLowerCase() : r));
  return (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role (${req.user?.role || 'unknown'}) is not allowed to access this resource`
      });
    }
    next();
  };
};

// Middleware to check Organizer  role
const isOrganizer = (req, res, next) => {
  console.log('Checking Organizer role for user:', req.user);
  if (req.user && req.user.role === 'organizer') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Organizer role required.',
    });
  }
};

const verifyOrganizer = [authMiddleware, isOrganizer];

// Middleware to check admin role
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.',
    });
  }
};

const isParticipant = (req, res, next) => {
  if (req.user && req.user.role === 'participant') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Participant role required.',
    });
  }
};


// Middleware to check if user is a seller or buyer (allows both roles)
// const isSellerOrBuyer = (req, res, next) => {
//   if (req.user && (req.user.role === 'buyer' || req.user.role === 'seller')) {
//     next();
//   } else {
//     res.status(403).json({
//       success: false,
//       message: 'Access denied. Buyer or Seller role required.',
//     });
//   }
// };

module.exports = {
  authMiddleware,
  verifyToken: authMiddleware,
  authorizeRoles,
  verifyOrganizer,
    isOrganizer,
    isAdmin,
    isParticipant
//   isSellerOrBuyer
};
