import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import './Auth.css';

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.access_token);
        const decoded = jwtDecode(data.access_token);

        if (decoded.rol === 'superadmin') {
          navigate('/superadmin');
        } else if (decoded.rol === 'evaluador') {
          navigate('/admin');
        } else {
          navigate('/user');
        }
      } else {
        setError(data.detail || 'Error al iniciar sesión');
      }
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <a className="auth-brand" href="/" aria-label="GovTech Perú, inicio">
          <span className="auth-brand-mark" aria-hidden="true">G</span>
          <span>GOVTECH<span className="auth-brand-caption">PERÚ · CONTRATACIÓN PÚBLICA</span></span>
        </a>
        <div className="auth-aside-copy">
          <p className="auth-eyebrow">Plataforma de contrataciones</p>
          <h1>Procesos públicos, gestionados con claridad.</h1>
          <p>Ingresa con tu cuenta. El acceso te llevará al espacio correspondiente a tu rol.</p>
          <div className="auth-role-summary" aria-label="Roles de la plataforma">
            <span>Postulante</span><span>Evaluador</span><span>Superadmin</span>
          </div>
        </div>
        <div className="auth-aside-footer"><span>Gobierno digital</span><span>Acceso seguro</span></div>
      </aside>

      <main className="auth-main">
        <section className="auth-card" aria-labelledby="login-title">
          <a className="auth-brand auth-mobile-brand" href="/" aria-label="GovTech Perú, inicio">
            <span className="auth-brand-mark" aria-hidden="true">G</span>
            <span>GOVTECH<span className="auth-brand-caption">PERÚ</span></span>
          </a>
          <header className="auth-header">
            <p className="auth-eyebrow">Acceso a tu cuenta</p>
            <h2 id="login-title">Iniciar sesión</h2>
            <p className="auth-subtitle">Usa el correo y la contraseña asociados a tu cuenta.</p>
          </header>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="auth-error" role="alert">{error}</div>}

            <div className="form-group">
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="nombre@empresa.pe"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Ingresa tu contraseña"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Verificando acceso…' : 'Ingresar'}
            </button>
          </form>

          <footer className="auth-footer">
            <p className="auth-link">
              ¿Primera vez en la plataforma?
              <button type="button" className="link-button" onClick={() => navigate('/register')}>
                Crear cuenta de postulante
              </button>
            </p>
          </footer>
        </section>
      </main>
    </div>
  );
}

export default Login;
