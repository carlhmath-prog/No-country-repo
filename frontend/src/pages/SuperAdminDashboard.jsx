import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [evaluadores, setEvaluadores] = useState([]);
  const [form, setForm] = useState({ nombre_completo: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let isActive = true;
    adminService.listarEvaluadores()
      .then((data) => { if (isActive) setEvaluadores(data); })
      .catch((requestError) => { if (isActive) setError(requestError.response?.data?.detail || 'No se pudieron cargar los evaluadores.'); });
    return () => { isActive = false; };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      const nuevoEvaluador = await adminService.crearEvaluador(form);
      setEvaluadores((current) => [...current, nuevoEvaluador]);
      setForm({ nombre_completo: '', email: '', password: '' });
      setSuccess('Cuenta de evaluador creada.');
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'No se pudo crear el evaluador.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <main style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Administración de plataforma</h1>
          <p style={styles.subtitle}>Superadministrador</p>
        </div>
        <button type="button" onClick={handleLogout} style={styles.secondaryButton}>Cerrar sesión</button>
      </header>

      {error && <p role="alert" style={styles.error}>{error}</p>}
      {success && <p role="status" style={styles.success}>{success}</p>}

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Crear cuenta de evaluador</h2>
        <p style={styles.subtitle}>Los evaluadores acceden a la publicación y revisión de procesos. El registro público no puede asignar este rol.</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Nombre completo
            <input required maxLength="150" value={form.nombre_completo} onChange={(event) => setForm({ ...form, nombre_completo: event.target.value })} style={styles.input} />
          </label>
          <label style={styles.label}>Correo electrónico
            <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} style={styles.input} />
          </label>
          <label style={styles.label}>Contraseña inicial (mínimo 12 caracteres)
            <input required type="password" minLength="12" maxLength="128" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} style={styles.input} />
          </label>
          <button type="submit" style={styles.primaryButton}>Crear cuenta evaluadora</button>
        </form>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Evaluadores activos</h2>
        {evaluadores.length === 0 ? <p style={styles.subtitle}>Todavía no hay evaluadores.</p> : (
          <ul style={styles.list}>
            {evaluadores.map((evaluador) => (
              <li key={evaluador.id} style={styles.listItem}>
                <span>{evaluador.nombre_completo}</span><span>{evaluador.email}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

const styles = {
  container: { maxWidth: '1040px', margin: '32px auto', padding: '0 24px', color: '#1c2e27' },
  header: { display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cbd4cd', paddingBottom: '18px', marginBottom: '24px' },
  title: { margin: 0, fontSize: '24px' },
  subtitle: { color: '#596575', margin: '6px 0 0' },
  section: { padding: '22px 0', borderBottom: '1px solid #d5ddd7' },
  sectionTitle: { fontSize: '18px', margin: '0 0 16px' },
  form: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', alignItems: 'end' },
  label: { display: 'grid', gap: '6px', fontSize: '14px', fontWeight: 600 },
  input: { minWidth: 0, width: '100%', padding: '10px', border: '1px solid #aeb8c4', borderRadius: '4px', boxSizing: 'border-box' },
  primaryButton: { minHeight: '40px', border: 0, borderRadius: '4px', padding: '0 16px', color: 'white', background: '#176b57', cursor: 'pointer' },
  secondaryButton: { minHeight: '36px', border: '1px solid #8995a3', borderRadius: '4px', padding: '0 12px', background: 'white', cursor: 'pointer' },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  listItem: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '12px', padding: '12px 0', borderBottom: '1px solid #e4e9e5' },
  error: { color: '#9c2424' },
  success: { color: '#176b57' },
};