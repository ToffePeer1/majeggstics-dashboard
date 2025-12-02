# Maj Analytics Dashboard - React + TypeScript

A comprehensive analytics dashboard for tracking Egg Inc. player statistics with Discord OAuth authentication.

## Features

- 🔐 Discord OAuth authentication with role-based access control
- 📊 Player profile analysis with historical data
- 🏆 Leaderboards and rankings
- 📈 Community trends over time
- ⚖️ Multi-player comparisons
- 📱 Responsive design

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router** - Routing
- **React Query** - Data fetching & caching
- **Plotly.js** - Interactive charts
- **Supabase** - Backend database
- **Axios** - HTTP client

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account
- Discord OAuth application

### Installation

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```text
src/
├── assets/          # Static assets
├── components/      # Reusable UI components
├── config/          # Configuration files
├── contexts/        # React contexts (auth, etc.)
├── hooks/           # Custom React hooks
├── pages/           # Page components
├── services/        # API services
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── App.tsx          # Main app component
└── main.tsx         # Entry point
```

## Environment Variables

See `.env.example` for all required environment variables.

## License

MIT
