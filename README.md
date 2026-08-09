# Muzworm — initial authentication setup

This repository contains a minimal authentication skeleton (Node.js + Express + MongoDB) with:

- User model with bcrypt password hashing
- Registration and login routes
- Session-based authentication (express-session + connect-mongo)
- Profile route with per-user privacy (profilePublic flag)
- Script to create an admin user
- Optional: automatic admin creation on startup via environment variables ADMIN_EMAIL and ADMIN_PASSWORD

Quick start:

1) Copy `.env.example` to `.env` and fill values (MONGO_URI, SESSION_SECRET). Optionally set ADMIN_EMAIL and ADMIN_PASSWORD to create an admin at first startup.
2) npm install
3) npm run dev
4) (Optional) Create admin manually: node scripts/create-admin.js admin@example.com strongpassword

If you want a different stack, tell me and I'll adapt the implementation.
