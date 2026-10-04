import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

function PrivateRoute({ children, role }) {
  const token = localStorage.getItem('token');

  // ❌ sin token → bloquear
  if (!token) {
    return <Navigate to="/" />;
  }

  let decoded;
  try {
    decoded = jwtDecode(token);
  } catch {
    decoded = null;
  }

  if (!decoded?.rol || (role && decoded.rol !== role)) {
    return <Navigate to="/" />;
  }

  return children;
}

export default PrivateRoute;