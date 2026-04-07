import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Layout      from './components/Layout';
import Login       from './components/Login';
import SignUp      from './components/SignUp';
import Profile     from './components/Profile';
import Dashboard   from './pages/Dashboard';
import PendingPage from './pages/PendingPage';
import CompletePage from './pages/CompletePage';

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userId');
    setCurrentUser(null);
  }, []);

  return (
    <Routes>
      <Route
        path="/"
        element={
          currentUser ? (
            <Layout user={currentUser} onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route index element={<Dashboard onLogout={handleLogout} />} />
        <Route
          path="profile"
          element={<Profile user={currentUser} onLogout={handleLogout} />}
        />
        <Route path="pending"  element={<PendingPage  onLogout={handleLogout} />} />
        <Route path="complete" element={<CompletePage onLogout={handleLogout} />} />
      </Route>

      <Route path="/login"  element={<Login onSubmit={setCurrentUser} />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="*"       element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;