// Script to create admin user. Usage:
// node scripts/create-admin.js admin@example.com password

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../src/models/User');

dotenv.config();

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) { console.error('MONGO_URI is not set'); process.exit(1); }
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

  const [email, password] = process.argv.slice(2);
  if (!email || !password) { console.error('Usage: node scripts/create-admin.js email password'); process.exit(1); }

  const exists = await User.findOne({ email });
  if (exists) { console.log('User already exists'); process.exit(0); }

  const passwordHash = await User.hashPassword(password);
  const user = new User({ email, passwordHash, isAdmin: true, profilePublic: false });
  await user.save();
  console.log('Admin created:', user._id.toString());
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
