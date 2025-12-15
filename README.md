# Majeggstics Analytics Dashboard

A comprehensive analytics dashboard for tracking Majeggstics players' statistics with Discord OAuth authentication and role-based access control.  
Deployed at [https://majeggstics-dashboard.vercel.app/login](https://majeggstics-dashboard.vercel.app/login)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![React](https://img.shields.io/badge/React-18.2-blue)

## Features

- Secure Discord OAuth with custom JWT authentication
- Player analytics tracking individual progress over time
- Live leaderboards with automatic caching
- Community trends and guild-wide statistics
- Player comparison tool
- Automated snapshot system with email notifications
- Responsive design

## Contributing

This is a collaborative project with a shared Supabase instance. Contact me (`@toffepeer1` on Discord) for development credentials.

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Development credentials (contact me on Discord)

### Setup

```bash
# Clone and install
git clone https://github.com/ToffePeer1/majeggstics-dashboard.git
cd majeggstics-dashboard
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with credentials I provide

# Run development server
npm run dev

# Before committing, validate your changes
npm run validate
```

## Project Structure

```
├── src/
│   ├── components/       # Reusable UI components
│   │   └── charts/       # Plotly.js chart components
│   ├── pages/            # Route components
│   ├── hooks/            # Custom React hooks (useAuth, usePlayerData)
│   ├── contexts/         # React Context providers
│   ├── services/         # External integrations (Supabase client)
│   ├── utils/            # Pure utility functions
│   ├── types/            # TypeScript type definitions
│   └── config/           # Configuration constants
│
├── supabase/
│   ├── functions/        # Deno Edge Functions
│   │   ├── _shared/      # Shared code (types, logic, email)
│   │   ├── discord-auth/ # OAuth handler
│   │   ├── get-leaderboard/
│   │   ├── get-player-current-stats/
│   │   ├── update-player-data/
│   │   ├── delete-snapshot/
│   │   └── refresh-leaderboard-cron/
│   │
│   └── migrations/       # Database migrations (apply in order)
│
└── .env.example          # Environment variable template
```

## Pull Requests

- Test your changes locally
- Run `npm run validate` (must pass)
- Write a clear description of what changed
- Backend/infrastructure changes need coordination with me

## License

MIT
