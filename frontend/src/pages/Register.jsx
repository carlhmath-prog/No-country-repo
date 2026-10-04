import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre_completo: '',
    email: '',
    password: '',
    rol: 'postulante',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('¡Registro exitoso! Redirigiendo a login...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(data.detail || 'Error al registrarse');
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
          <p className="auth-eyebrow">Registro público</p>
          <h1>Postula a procesos con una sola cuenta.</h1>
          <p>Completa tu perfil empresarial después de registrarte para presentar ofertas y consultar convocatorias.</p>
          <div className="auth-role-summary" aria-label="Roles de la plataforma">
            <span>Postulante</span><span>Evaluador</span><span>Superadmin</span>
          </div>
        </div>
        <div className="auth-aside-footer"><span>Registro gratuito</span><span>Identidad por roles</span></div>
      </aside>

      <main className="auth-main">
        <section className="auth-card" aria-labelledby="register-title">
          <a className="auth-brand auth-mobile-brand" href="/" aria-label="GovTech Perú, inicio">
            <span className="auth-brand-mark" aria-hidden="true">G</span>
            <span>GOVTECH<span className="auth-brand-caption">PERÚ</span></span>
          </a>
          <header className="auth-header">
            <p className="auth-eyebrow">Crear cuenta</p>
            <h2 id="register-title">Registro de postulante</h2>
            <p className="auth-subtitle">Los datos de empresa se completan en tu primer acceso.</p>
          </header>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="auth-error" role="alert">{error}</div>}
            {success && <div className="auth-success" role="status">{success}</div>}

            <fieldset className="role-fieldset">
              <legend>Tipo de cuenta</legend>
              <label className={`role-option ${form.rol === 'postulante' ? 'role-option-selected' : ''}`}>
                <input type="radio" name="rol" value="postulante" checked={form.rol === 'postulante'} onChange={handleChange} />
                <span className="role-option-copy"><strong>Postulante</strong><span>Registro público para participar en convocatorias.</span></span>
                <span className="role-option-status">Abierto</span>
              </label>
              <div className="role-option role-option-restricted" aria-disabled="true">
                <span className="role-option-copy"><strong>Evaluador</strong><span>Cuenta creada por el superadmin de la plataforma.</span></span>
                <span className="role-option-status">Por invitación</span>
              </div>
              <div className="role-option role-option-restricted" aria-disabled="true">
                <span className="role-option-copy"><strong>Superadmin</strong><span>Acceso de administración inicial y privado.</span></span>
                <span className="role-option-status">Privado</span>
              </div>
            </fieldset>

            <div className="form-group">
              <label htmlFor="nombre_completo">Nombre completo</label>
              <input id="nombre_completo" name="nombre_completo" type="text" autoComplete="name" maxLength="150" placeholder="Nombre y apellidos" value={form.nombre_completo} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label htmlFor="email">Correo electrónico</label>
              <input id="email" name="email" type="email" autoComplete="email" placeholder="nombre@empresa.pe" value={form.email} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input id="password" name="password" type="password" autoComplete="new-password" minLength="8" placeholder="Mínimo 8 caracteres" value={form.password} onChange={handleChange} required />
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Creando cuenta…' : 'Crear cuenta de postulante'}
            </button>
          </form>

          <footer className="auth-footer">
            <p className="auth-link">
              ¿Ya tienes cuenta?
              <button type="button" className="link-button" onClick={() => navigate('/login')}>Iniciar sesión</button>
            </p>
          </footer>
        </section>
      </main>
    </div>
  );
}

export default Register;
