// Middleware to check user role
exports.isParticipant = (req, res, next) => {
  const role = req.user && typeof req.user.role === 'string' ? req.user.role.toLowerCase() : undefined;
  if (role === "participant") {
    next(); // User is a Participant, proceed
  } else {
    res.status(403).json({
      success: false,
      message: "Access denied. Participant role required.",
    });
  }
};

exports.isAdmin = (req, res, next) => {
  const role = req.user && typeof req.user.role === 'string' ? req.user.role.toLowerCase() : undefined;
  if (role === "admin") {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: "Access denied. Admin role required.",
    });
  }
};

exports.isOrganizer = (req, res, next) => {
  const role = req.user && typeof req.user.role === 'string' ? req.user.role.toLowerCase() : undefined;
  if (role === "organizer") {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: "Access denied. Organizer role required.",
    });
  }
};
