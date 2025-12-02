import { createContext } from 'react';
import type { AuthState } from '@/types';
import type { createAuthenticatedClient } from '@/services/supabaseClient';

export interface AuthContextType extends AuthState {
  signInWithDiscord: () => void;
  handleAuthCallback: (code: string) => Promise<void>;
  logout: () => void;
  isAdmin: () => boolean;
  getAuthenticatedClient: () => ReturnType<typeof createAuthenticatedClient> | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
