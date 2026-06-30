export type AuthContextType = {
  supabase: null;
  session: null;
  isRefreshingSession: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<null>;
  handleAuthCallback: (url: string) => Promise<void>;
  setSessionFromTokens: (
    accessToken: string,
    refreshToken: string,
  ) => Promise<void>;
  getHeaders: () => Record<string, string> | null;
  getAvatarUrl: () => Promise<string | null>;
};

const AUTH_STUB: AuthContextType = {
  supabase: null,
  session: null,
  isRefreshingSession: false,
  signIn: async () => {},
  signOut: async () => {},
  refreshSession: async () => null,
  handleAuthCallback: async () => {},
  setSessionFromTokens: async () => {},
  getHeaders: () => null,
  getAvatarUrl: async () => null,
};

export function useAuth() {
  return AUTH_STUB;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return children;
}
