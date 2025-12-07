import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import AuthCallback from '@/pages/AuthCallback';
import PlayerProfile from '@/pages/PlayerProfile';
import Leaderboards from '@/pages/Leaderboards';
import WeeklyTrends from '@/pages/WeeklyTrends';
import PlayerComparison from '@/pages/PlayerComparison';
import MyStats from '@/pages/MyStats';
import '@/styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin()) {
    return <Navigate to="/my-stats" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      <Route element={<Layout />}>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Navigate to="/my-stats" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/player-profile"
          element={
            <ProtectedRoute adminOnly>
              <PlayerProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaderboards"
          element={
            <ProtectedRoute>
              <Leaderboards />
            </ProtectedRoute>
          }
        />
        <Route
          path="/weekly-trends"
          element={
            <ProtectedRoute adminOnly>
              <WeeklyTrends />
            </ProtectedRoute>
          }
        />
        <Route
          path="/player-comparison"
          element={
            <ProtectedRoute adminOnly>
              <PlayerComparison />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-stats"
          element={
            <ProtectedRoute>
              <MyStats />
            </ProtectedRoute>
          }
        />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
