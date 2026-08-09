const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const User = require('./models/User');

const app = express();
app.use(express.json());

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/muzworm';

async function ensureAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) return;

    const existing = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existing) {
      console.log('Admin already exists:', existing.email);
      return;
    }

    const passwordHash = await User.hashPassword(adminPassword);
    const user = new User({ email: adminEmail, passwordHash, isAdmin: true, profilePublic: false });
    await user.save();
    console.log('Admin user created:', user.email);
  } catch (err) {
    console.error('Failed to ensure admin user:', err);
  }
}

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to MongoDB');
    // Create admin user automatically if env vars are set
    await ensureAdmin();
  })
  .catch(err => { console.error('MongoDB connection error:', err); process.exit(1); });

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: mongoUri }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  }
}));

app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);

app.get('/', (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on port ${port}`));
