const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const PROFILE_SCHEMA = {
  displayName: { type: String, default: '' },
  bio: { type: String, default: '' },
  // add additional profile fields here
};

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  profile: { type: Object, default: {} },
  profilePublic: { type: Boolean, default: false },
}, { timestamps: true });

userSchema.methods.verifyPassword = function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.statics.hashPassword = function(password) {
  return bcrypt.hash(password, 12);
};

module.exports = mongoose.model('User', userSchema);
