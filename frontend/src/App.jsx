import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';

import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* 👤 SOLO POSTULANTE */}
        <Route
          path="/user"
          element={
            <PrivateRoute role="postulante">
              <UserDashboard />
            </PrivateRoute>
          }
        />

        {/* 👑 SOLO ADMIN */}
        <Route
          path="/admin"
          element={
            <PrivateRoute role="administrador">
              <AdminDashboard />
            </PrivateRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;