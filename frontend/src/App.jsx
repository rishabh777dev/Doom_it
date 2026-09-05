import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Public & Contestant Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RulesPage from './pages/RulesPage';
import LeaderboardPage from './pages/LeaderboardPage';
import LevelsPage from './pages/LevelsPage';
import ArenaPage from './pages/ArenaPage';

// Admin Isolated Pages
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import SessionSupersededModal from './components/SessionSupersededModal';
import ErrorBoundary from './components/ErrorBoundary';

import { apiGetTimer, apiGetMe, getToken } from './services/api';

function AppContent() {
  const [user, setUser] = useState(null);
  const [timerState, setTimerState] = useState(null);
  const [sessionSuperseded, setSessionSuperseded] = useState(false);
  const location = useLocation();

  const loadUser = async () => {
    if (getToken()) {
      try {
        const u = await apiGetMe();
        setUser(u);
      } catch (err) {
        setUser(null);
      }
    } else {
      setUser(null);
    }
  };

  const loadTimer = async () => {
    try {
      const t = await apiGetTimer();
      setTimerState(t);
    } catch (err) {
      console.error('Failed to load timer:', err);
    }
  };

  useEffect(() => {
    loadUser();
    loadTimer();

    const onAuthChange = () => loadUser();
    const onSessionSuperseded = () => setSessionSuperseded(true);

    window.addEventListener('auth_change', onAuthChange);
    window.addEventListener('session_superseded', onSessionSuperseded);

    // 1-second countdown interval
    const timerInterval = setInterval(() => {
      setTimerState((prev) => {
        if (!prev) return prev;
        if (prev.status === 'live' && prev.time_remaining_seconds > 0) {
          return {
            ...prev,
            time_remaining_seconds: prev.time_remaining_seconds - 1,
          };
        }
        return prev;
      });
    }, 1000);

    const syncInterval = setInterval(loadTimer, 15000);

    return () => {
      window.removeEventListener('auth_change', onAuthChange);
      window.removeEventListener('session_superseded', onSessionSuperseded);
      clearInterval(timerInterval);
      clearInterval(syncInterval);
    };
  }, []);

  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between selection:bg-brand-blue selection:text-white">
      {/* Graceful Single-Device Handover Modal */}
      <SessionSupersededModal
        isOpen={sessionSuperseded}
        onClose={() => setSessionSuperseded(false)}
      />
      
      {/* Show Participant Navbar ONLY for non-admin routes */}
      {!isAdminRoute && (
        <Navbar user={user} timerState={timerState} />
      )}

      {/* Main Routed Content */}
      <main className="flex-1">
        <ErrorBoundary>
          <Routes>
            {/* Public or Role-Redirected Routes */}
            <Route
              path="/"
              element={
                user ? (
                  user.role === 'ADMIN' ? (
                    <Navigate to="/admin/dashboard" replace />
                  ) : (
                    <Navigate to="/levels" replace />
                  )
                ) : (
                  <LandingPage user={user} timerState={timerState} />
                )
              }
            />
            <Route path="/rules" element={<RulesPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage user={user} />} />
            <Route
              path="/login"
              element={
                user ? (
                  user.role === 'ADMIN' ? (
                    <Navigate to="/admin/dashboard" replace />
                  ) : (
                    <Navigate to="/levels" replace />
                  )
                ) : (
                  <LoginPage />
                )
              }
            />

            {/* Protected Contestant Routes */}
            <Route
              path="/levels"
              element={
                <ProtectedRoute user={user}>
                  <LevelsPage user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/arena"
              element={
                <ProtectedRoute user={user}>
                  <ArenaPage user={user} />
                </ProtectedRoute>
              }
            />

            {/* Isolated Admin Routes */}
            <Route
              path="/admin/login"
              element={
                user && user.role === 'ADMIN' ? (
                  <Navigate to="/admin/dashboard" replace />
                ) : (
                  <AdminLoginPage />
                )
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute user={user} adminOnly={true}>
                  <AdminDashboardPage timerState={timerState} onStateUpdated={loadTimer} />
                </ProtectedRoute>
              }
            />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>

      {/* Footer for non-admin routes */}
      {!isAdminRoute && (
        <footer className="py-8 bg-white border-t border-slate-200/80 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500">
            <div className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="VakyaBhed Logo"
                className="w-6 h-6 object-contain rounded-md drop-shadow-sm"
              />
              <span>VakyaBhed 2026 | AI Safety & Adversarial CTF Arena</span>
            </div>

            <div className="flex items-center gap-6">
              <a href="/rules" className="hover:text-slate-900 transition-colors">
                Rules & Guidelines
              </a>
              <a href="/leaderboard" className="hover:text-slate-900 transition-colors">
                Scoreboard
              </a>
              <span className="text-slate-400">High-Speed Multi-Node Cluster</span>
            </div>
          </div>
        </footer>
      )}

    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
