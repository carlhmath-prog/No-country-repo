import React from 'react';
import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

function PrivateRoute({ children, role }) {
  const token = localStorage.getItem('token');

  // ❌ sin token → bloquear
  if (!token) {
    return <Navigate to="/" />;
  }

  try {
    const decoded = jwtDecode(token);

    console.log("DECODED TOKEN:", decoded);

    // ❌ sin rol en token → bloquear
    if (!decoded.rol) {
      return <Navigate to="/" />;
    }

    // ❌ rol incorrecto → bloquear
    if (role && decoded.rol !== role) {
      return <Navigate to="/" />;
    }

    // ✅ todo OK → permitir acceso
    return children;

  } catch (error) {
    return <Navigate to="/" />;
  }
}

export default PrivateRoute;