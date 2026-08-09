# Muzworm — initial authentication setup

This repository contains a minimal authentication skeleton (Node.js + Express + MongoDB) with:

- User model with bcrypt password hashing
- Registration and login routes
- Session-based authentication (express-session + connect-mongo)
- Profile route with per-user privacy (profilePublic flag)
- Script to create an admin user

Quick start:

1) Copy `.env.example` to `.env` and fill values (MONGO_URI, SESSION_SECRET)
2) npm install
3) npm run dev
4) (Optional) Create admin: node scripts/create-admin.js admin@example.com strongpassword

If you want a different stack, tell me and I'll adapt the implementation.
