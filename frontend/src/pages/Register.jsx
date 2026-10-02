import React, { useState } from 'react';
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

    // Sincronización de rol: Mapeamos 'administrador' a 'admin' para cumplir con FastAPI y PostgreSQL
    const payloadEnvio = {
      ...form,
      rol: form.rol === 'administrador' ? 'admin' : form.rol
    };

    try {
      const res = await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadEnvio), // Enviamos el payload corregido
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('¡Registro exitoso! Redirigiendo a login...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(data.detail || 'Error al registrarse');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Crear Cuenta</h1>
          <p className="auth-subtitle">Regístrate para comenzar</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <div className="form-group">
            <label htmlFor="nombre">Nombre Completo</label>
            <input
              id="nombre"
              name="nombre_completo"
              type="text"
              placeholder="Juan Pérez"
              value={form.nombre_completo}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="tu@email.com"
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
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="rol">Tipo de Usuario</label>
            <select 
              id="rol"
              name="rol" 
              value={form.rol}
              onChange={handleChange}
            >
              <option value="postulante">Postulante</option>
              <option value="administrador">Administrador</option>
            </select>
          </div>

          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>

        <div className="auth-footer">
          <p className="auth-link">
            ¿Ya tienes cuenta? 
            <button 
              type="button"
              className="link-button"
              onClick={() => navigate('/login')}
            >
              Inicia sesión aquí
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
