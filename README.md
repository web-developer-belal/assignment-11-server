
---

## ✅ 2️⃣ Backend: `artifact-tracker-backend`

```markdown
# 🔗 Artifact Tracker – Backend (Express.js API)

This is the backend API for the Artifact Tracker project. Built with **Express.js**, it handles authentication, secure token management, and MongoDB-based data storage.

🔗 **API Live:** [https://artifact-backend.vercel.app](https://artifact-backend.vercel.app)  
🔗 **Frontend Repo:** [Artifact Tracker Frontend](https://github.com/web-developer-belal/artifact-tracker)

---

## 🚀 Tech Stack
- `Node.js` / `Express.js`
- `MongoDB`
- `JWT` (Authentication)
- `Cookie Parser`, `CORS`, `dotenv`

---

## ✨ Main Features
- 🔐 User authentication with JWT access & refresh tokens
- 🗃️ Secure CRUD operations for artifacts
- 🍪 Cookie-based token handling
- 🌐 CORS and environment-based config
- 📡 Built for frontend communication via REST

---

## 📦 Key Dependencies
- `express` `^5.1.0`
- `mongodb` `^6.17.0`
- `jsonwebtoken` `^9.0.2`
- `cookie-parser`, `dotenv`, `cors`

---

## 🔐 Environment Setup

Create a `.env` file in the root with the following:

```env
DB_USER=
DB_PASSWORD=
JWT_SECRET=

