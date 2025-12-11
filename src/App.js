import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import SavedSchedules from "./components/SavedSchedules";
import CompareSchedules from "./components/CompareSchedules";
import Login from "./components/auth/Login";
import Signup from "./components/auth/Signup";
import { initSecurity } from "./utils/security";
import "./App.css";

/**
 * Simple auth check (demo). Replace with real auth later.
 */
const isAuthenticated = () => !!localStorage.getItem("token");

function RequireAuth({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  // Initialize security measures on app load
  useEffect(() => {
    initSecurity();
  }, []);

  return (
    <Router>
      <Routes>
        {/* Auth pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Root "/" should show the login page */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Protected dashboard */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />

        {/* Protected saved schedules */}
        <Route
          path="/saved-schedules"
          element={
            <RequireAuth>
              <SavedSchedules />
            </RequireAuth>
          }
        />

        {/* Protected compare schedules */}
        <Route
          path="/compare-schedules"
          element={
            <RequireAuth>
              <CompareSchedules />
            </RequireAuth>
          }
        />

        {/* Fallback: send to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
