const express = require('express');
const router = express.Router();
const { requireAuth, canViewProfile } = require('../middleware/auth');
const User = require('../models/User');

// Get profile (public fields or full if owner)
router.get('/:userId', canViewProfile, (req, res) => {
  const u = req.targetUser;
  const isOwner = req.session && String(req.session.userId) === String(u._id);
  if (isOwner) return res.json({ email: u.email, profile: u.profile, profilePublic: u.profilePublic });

  const publicProfile = {
    displayName: u.profile.displayName || '',
    // add other public fields here
  };
  return res.json({ profile: publicProfile });
});

// Update profile (owner only)
router.patch('/:userId', requireAuth, async (req, res) => {
  try {
    if (String(req.session.userId) !== req.params.userId) return res.status(403).json({ error: 'Forbidden' });
    const updates = req.body.profile || {};
    const profilePublic = req.body.profilePublic;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.profile = Object.assign(user.profile || {}, updates);
    if (typeof profilePublic === 'boolean') user.profilePublic = profilePublic;
    await user.save();
    res.json({ profile: user.profile, profilePublic: user.profilePublic });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
