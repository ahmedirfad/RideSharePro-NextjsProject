<div align="center">

<!-- Wave Header -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=200&section=header&text=RideSharePro&fontColor=fff&fontSize=52&animation=fadeIn&fontAlignY=38&desc=Intercity%20Carpooling%2C%20Built%20for%20Real%20Trips&descAlignY=60&descSize=16" />

</div>

<!-- Typing Banner -->
<div align="center">
<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=22&duration=3000&pause=1000&color=00C2FF&center=true&vCenter=true&width=900&multiline=false&lines=Next.js+%2B+Express+%2B+MongoDB;Real-time+Trip+Tracking+with+Socket.IO;Stripe+Payments+%7C+JWT+Auth+%7C+Push+Notifications;Dockerized+%26+Ready+to+Deploy" alt="Typing SVG" />
</div>

<br/>

<!-- Badges Row -->
<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

</div>

---

## 🚗 About the Project

```typescript
const rideSharePro = {
  name        : "RideSharePro",
  type        : "Intercity carpooling platform",
  frontend    : "Next.js (App Router) + TypeScript",
  backend     : "Node.js + Express",
  database    : "MongoDB",
  cache       : "Redis (Upstash)",
  realtime    : "Socket.IO",
  payments    : "Stripe",
  auth        : ["JWT", "Google OAuth"],
  extras      : ["Cloudinary uploads", "Web Push (VAPID)", "Email notifications"],
  status      : "🐳 Dockerized, in progress toward AWS deployment",
};
```

RideSharePro connects drivers hosting intercity trips with riders looking to book seats — think a lightweight, purpose-built carpooling marketplace with real-time trip tracking, in-app messaging, and a full booking-to-payment flow.

<br/>

## 🛠️ Tech Stack

<div align="center">

### Frontend
<br/>
<img src="https://skillicons.dev/icons?i=nextjs,react,ts,tailwind&theme=dark&perline=5" />
<br/><br/>

### Backend
<br/>
<img src="https://skillicons.dev/icons?i=nodejs,express,mongodb,redis&theme=dark&perline=5" />
<br/><br/>

### Infra & Tools
<br/>
<img src="https://skillicons.dev/icons?i=docker,stripe,git,github&theme=dark&perline=6" />
<br/>

</div>

---

## ✨ Features

| For Riders | For Hosts | Platform |
|:-----------|:----------|:---------|
| 🔍 Search trips by route & date | 🚘 Post & manage trips | 🛡️ Admin dashboard (users, trips, bookings) |
| 💺 Book & pay for seats (Stripe) | 📊 Track earnings | ⚖️ Dispute resolution |
| 💬 In-app messaging with hosts | ✅ Verification workflow | 📈 Analytics |
| 🔔 Real-time notifications | 🧾 View bookings for a trip | 🧑‍💼 User & trip moderation |
| ⭐ Leave reviews after a trip | 💬 Quick-reply messaging | ⚙️ Platform settings |
| 📍 Live active-trip tracking | | 📧 Email notification logs |

**Auth:** Email/password with JWT + Google OAuth, with email verification.
**Real-time:** Socket.IO powers live trip status and in-app messaging.
**Notifications:** Web Push (VAPID) + email, in addition to in-app alerts.

---

## 📁 Project Structure

```
RideSharePro/
├── client/          # Next.js (App Router) frontend
│   ├── app/
│   │   ├── (auth)/      # Login, register, email verification
│   │   ├── (user)/      # Search, trips, bookings, messages, earnings, host tools
│   │   └── (admin)/     # Admin dashboard: users, trips, disputes, analytics
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── store/
│
└── server/          # Express REST API
    ├── config/          # DB, Redis, email config
    ├── controllers/
    ├── models/          # User, Trip, Booking, Review, Dispute, Message, Notification
    ├── routes/
    ├── services/
    ├── socket/          # Real-time events
    └── validation/
```

---

## 🐳 Running with Docker

The project is fully containerized — client, server, and env config are wired through `docker-compose.yml`.

```bash
# 1. Set up env files
cp server/.env.example server/.env      # fill in your real secrets
cp .env.example .env                    # fill in NEXT_PUBLIC_* build args

# 2. Build and run
docker-compose up --build
```

| Service | URL |
|:--------|:----|
| Client | http://localhost:3000 |
| Server | http://localhost:5002 |
| Health check | http://localhost:5002/health |

---

## ⚙️ Running Locally (without Docker)

```bash
# Server
cd server
npm install
npm run dev

# Client (in a separate terminal)
cd client
npm install
npm run dev
```

---

## 🔑 Environment Variables

<details>
<summary><strong>Server (.env)</strong></summary>

```env
PORT=5002
MONGODB_URI=
REDIS_URL=
ACCESS_TOKEN_KEY=
REFRESH_TOKEN_KEY=
GOOGLE_CLIENT_ID=
STRIPE_SECRET_KEY=
CLOUDINARY_URL=
EMAIL_HOST=
EMAIL_USER=
EMAIL_PASS=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```
</details>

<details>
<summary><strong>Client (.env.local)</strong></summary>

```env
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SERVER_URL=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
```
</details>

---

## 🗺️ Roadmap

- [x] Core booking & trip flow
- [x] Real-time messaging & notifications
- [x] Admin dashboard
- [x] Dockerized development & production setup
- [ ] AWS deployment (ECS/Fargate)
- [ ] CI/CD pipeline

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=120&section=footer&text=Built%20with%20%E2%98%95%20by%20Irfad&fontColor=fff&fontSize=15&animation=twinkling" />

</div>