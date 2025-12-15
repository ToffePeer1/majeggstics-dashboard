/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_DISCORD_CLIENT_ID: string;
  readonly VITE_EGGINC_GUILD: string;
  readonly VITE_EGGINC_WONKY_LEADER_ROLE: string;
  readonly VITE_EGGINC_MAJ_ROLE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
