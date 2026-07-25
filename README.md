# FU Ticket

Event ticketing platform with a React web app and an Expo mobile app. Users can discover events, buy tickets, apply discounts, pay online, and check in with QR codes. Includes AI helpers, real-time notifications, and role-based collaboration features.

## Features

- Event catalog, categories, and product/ticket management
- Checkout with Stripe payments and discount codes
- QR code ticket generation and scanning (mobile camera)
- Google OAuth, notifications, and Socket.io realtime updates
- Collaborator / social features and AI-assisted tooling
- Admin-style management flows on the web dashboard
- Companion mobile app for browsing events and check-in

## Tech Stack

| Layer | Technologies |
|--------|----------------|
| Web | React 18, Vite, Redux Toolkit, Ant Design, Tailwind/Sass, Socket.io Client, Recharts, Framer Motion |
| API | Node.js, Express 5, MongoDB (Mongoose), JWT, Stripe, Cloudinary, Socket.io, Jest |
| AI | OpenAI, Google Gemini |
| Mobile | Expo (React Native), React Navigation, AsyncStorage, camera / QR |

## Project Structure

```
FU-Ticket/
├── web/                 # Monorepo-style web project
│   ├── backend/         # Express API
│   └── fontend/         # React (Vite) client
└── mobile/              # Expo app (fu-ticket-mobie)
```

## Prerequisites

- Node.js 18+
- MongoDB
- Expo CLI / Expo Go for mobile
- Stripe account (for payments)

## Setup

### Backend

```bash
cd web/backend
npm install
# Create .env (MONGODB_URI, JWT_SECRET, STRIPE keys, etc.)
npm start
```

### Web frontend

```bash
cd web/fontend
npm install
# Point API base URL via .env if required
npm run dev
```

### Mobile

```bash
cd mobile
npm install
npx expo start
```

## Testing (API)

```bash
cd web/backend
npm test
```

## License

Educational / portfolio project.
