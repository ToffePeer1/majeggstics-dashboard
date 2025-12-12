# Majeggstics Analytics Dashboard - AI Coding Instructions

## Architecture Overview

This is a React + TypeScript dashboard for Egg Inc. player analytics with a **custom Discord OAuth security model** backed by Supabase. The critical architectural decision is using **custom JWT signing** instead of Supabase's built-in OAuth to maintain precise control over security claims and RLS policies.

### Core Security Model (READ FIRST)

**All security flows through custom JWTs signed by Edge Functions:**

1. User authenticates via Discord OAuth (only `identify` + `guilds.members.read` scopes)
2. Edge Function `discord-auth` exchanges OAuth code for Discord token (CLIENT_SECRET never exposed to frontend)
3. Edge Function validates guild membership and roles, then signs a JWT with `JWT_SECRET` containing custom claims: `discord_id`, `access_level`
4. Frontend stores JWT in localStorage and includes it in Authorization headers
5. Supabase validates JWT signatures on every request
6. RLS policies use `auth.jwt() ->> 'discord_id'` to filter data access

**Why this matters for development:**
- Never trust frontend JWT decoding for security - it's only for UX
- All data access is enforced by RLS policies in [supabase/migrations/001_rls_policies.sql](../supabase/migrations/001_rls_policies.sql)
- Users can see their JWT but cannot forge valid signatures
- The `createAuthenticatedClient()` function in [src/services/supabaseClient.ts](../src/services/supabaseClient.ts) is how authenticated requests are made

### Key Architectural Patterns

**Data Fetching:** React Query with authenticated Supabase clients. See [src/hooks/usePlayerData.ts](../src/hooks/usePlayerData.ts) for the pattern:
```typescript
const { getAuthenticatedClient, isAuthenticated, jwt } = useAuth();
// Include jwt in queryKey to invalidate cache when auth changes
queryKey: ['playerSnapshots', discordId, jwt],
```

**RLS-First Design:** Every table has RLS policies. The pattern from [supabase/migrations/001_rls_policies.sql](../supabase/migrations/001_rls_policies.sql):
```sql
USING (discord_id = (auth.jwt() ->> 'discord_id'))  -- Users see only their data
USING ((auth.jwt() ->> 'access_level') = 'admin')  -- Admins see everything
```

**Data Preprocessing:** Raw snapshots need normalization via `preprocessPlayerData()` in [src/utils/dataProcessing.ts](../src/utils/dataProcessing.ts):
- Fill missing `farmer_role` from `eb` using `EBtoRole()` helper
- Normalize `grade` to uppercase

## Critical Developer Workflows

### Local Development Setup
```bash
npm install
npm run dev  # Starts Vite dev server on port 3000
```

**Environment Variables Required** (see `.env.example`):
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key
- `VITE_DISCORD_CLIENT_ID` - Discord OAuth app ID
- `VITE_EGGINC_GUILD` - Discord guild ID for member validation
- `VITE_EGGINC_WONKY_LEADER_ROLE` - Discord role ID for admin access
- `VITE_EGGINC_MAJ_ROLE` - Discord role ID for base access

### Supabase Edge Functions Deployment

**Deploy all functions:**
```bash
supabase functions deploy
```

**Deploy specific function with secrets:**
```bash
supabase functions deploy discord-auth --no-verify-jwt
```

**Critical Edge Function Secrets** (set via `supabase secrets set`):
- `DISCORD_CLIENT_SECRET` - Never expose to frontend
- `JWT_SECRET` - For signing custom JWTs (must match Supabase project's JWT secret)
- `BOT_API_URL` - External player data API
- `RESEND_API_KEY` - Email notifications

### Testing Authentication Flow

1. Visit `/login` → redirects to Discord OAuth
2. After Discord approval → redirects to `/auth/callback?code=...`
3. `AuthCallback` page sends code to `discord-auth` Edge Function
4. Edge Function returns JWT → stored in localStorage
5. All subsequent requests use `createAuthenticatedClient(jwt)`

## Leaderboard Cron System

**Architecture:** pg_cron triggers `refresh-leaderboard-cron` Edge Function every 15 minutes.

**Snapshot Decision Logic** in [supabase/functions/_shared/snapshot-logic.ts](../supabase/functions/_shared/snapshot-logic.ts):
- **100% sync** + recent (65 min) + cooldown passed (1.5hr) → Save immediately
- **99% sync** + first attempt → Store as pending, wait 15 minutes for stragglers
- **99% sync** + second attempt → Save with warning email
- **<99% sync** → Don't save (players not synchronized)

**Manual Testing:**
```bash
# Test cron function with dry run
curl -X POST https://your-project.supabase.co/functions/v1/refresh-leaderboard-cron \
  -H "Authorization: Bearer YOUR_JWT"
```

## Project-Specific Conventions

### Import Alias
Use `@/` for all src imports (configured in [vite.config.ts](../vite.config.ts)):
```typescript
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/services/supabaseClient';
```

### Chart Components Pattern
All charts in [src/components/charts/](../src/components/charts/) use Plotly.js. Standard pattern:
```typescript
import Plot from 'react-plotly.js';
// Use GRADE_COLORS from constants.ts for consistency
import { GRADE_COLORS } from '@/config/constants';
```

### Access Control Pattern
Frontend access checks (UI only, not security):
```typescript
const { isAdmin } = useAuth();
if (!isAdmin()) return <Navigate to="/my-stats" />;
```

Backend security (actual enforcement):
```sql
-- In migration files: RLS policies check JWT claims
USING ((auth.jwt() ->> 'access_level') = 'admin')
```

## Integration Points

**Discord API:** Only accessed from Edge Functions, never frontend. See [supabase/functions/discord-auth/index.ts](../supabase/functions/discord-auth/index.ts).

**Bot API:** External player data source. Fetched by `refresh-leaderboard-cron` and cached in `leaderboard_cache` table for instant frontend access.

**Resend Email:** Notifications sent from `update-player-data` Edge Function using shared email service in [supabase/functions/_shared/email-service.ts](../supabase/functions/_shared/email-service.ts).

**Cross-Function Communication:** `refresh-leaderboard-cron` internally calls `update-player-data` via HTTP when snapshot conditions are met.

## Common Gotchas

1. **JWT in queryKey:** Always include `jwt` in React Query keys to invalidate cache on auth changes
2. **Preprocessing data:** Always run `preprocessPlayerData()` on snapshots before display/processing
3. **RLS testing:** Use Supabase Dashboard SQL Editor with "Use connection pooler" unchecked to test policies
4. **Edge Function CORS:** All Edge Functions need `corsHeaders` for frontend requests
5. **Admin routes:** Protected with both frontend checks (`<ProtectedRoute adminOnly>`) and RLS policies
6. **Excluded players:** Managed in `excluded_players` table - used by cron logic to skip broken saves

## Code Quality Standards

**After any changes, you MUST run:**
```bash
npm run lint
npm run typecheck
```
**RUN BOTH COMMANDS.**

If either command reports errors or warnings, you **must resolve them before considering the task complete**. This includes:
- Fixing ESLint violations (formatting, unused imports, etc.)
- Resolving TypeScript type errors
- Updating import statements if files are moved
- Adding proper type annotations where needed

Do not leave lint or type errors unresolved, even if the feature technically works. Type safety and code consistency are non-negotiable in this project.

## File Organization Logic

- **src/pages/** - Route components (one per React Router route)
- **src/components/** - Reusable UI components (Layout, charts, etc.)
- **src/hooks/** - React hooks (auth, data fetching)
- **src/contexts/** - React Context providers (auth state)
- **src/services/** - External integrations (Supabase client, permissions)
- **src/utils/** - Pure functions (data processing, formatters)
- **supabase/migrations/** - Database schema and RLS policies (numbered, apply in order)
- **supabase/functions/** - Deno-based Edge Functions (serverless API endpoints)
- **supabase/functions/_shared/** - Shared code for Edge Functions (types, logic, email service)
