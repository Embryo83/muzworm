const User = require('../models/User');

async function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Authentication required' });
  const user = await User.findById(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Invalid session' });
  req.user = user;
  next();
}

async function canViewProfile(req, res, next) {
  try {
    const targetUserId = req.params.userId;
    const target = await User.findById(targetUserId);
    if (!target) return res.status(404).json({ error: 'User not found' });

    if (req.session && String(req.session.userId) === String(target._id)) {
      req.targetUser = target;
      return next();
    }

    if (target.profilePublic) {
      req.targetUser = target;
      return next();
    }

    return res.status(403).json({ error: 'Profile is private' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { requireAuth, canViewProfile };
