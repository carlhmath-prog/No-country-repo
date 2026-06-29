
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { procesosService } from '../services/procesosService';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaCierre, setFechaCierre] = useState('');
  const [tituloTdr, setTituloTdr] = useState('');
  const [rutaTdr, setRutaTdr] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleCrearProceso = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 🛡️ Validación de seguridad: Verifica que la fecha exista y sea válida
    const objetoFecha = new Date(fechaCierre);
    if (!fechaCierre || isNaN(objetoFecha.getTime())) {
      setError('Por favor, ingrese una fecha y hora límite de cierre válida.');
      return;
    }

    const payload = {
      codigo,
      titulo,
      descripcion,
      fecha_cierre: objetoFecha.toISOString(), // Convertimos de forma segura
      entidad_id: 1,
      tdr: {
        version: "1.0",
        titulo: tituloTdr,
        descripcion: "TDR oficial digitalizado para el proceso",
        ruta_archivo: rutaTdr
      }
    };

    try {
      await procesosService.crearProceso(payload);
      setSuccess(`¡Convocatoria ${codigo} publicada con éxito! 🏛️`);
      setCodigo(''); setTitulo(''); setDescripcion(''); setFechaCierre(''); setTituloTdr(''); setRutaTdr('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al publicar la convocatoria.');
    }
  };


  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.mainTitle}>🏛️ Sistema de Contrataciones Estatales</h1>
          <p style={styles.subtitle}>Módulo de la Entidad Contratante — Registro de Licitaciones</p>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>Cerrar Sesión 🚪</button>
      </header>

      {error && <div style={styles.errorAlert}><strong>⚠️ Sistema:</strong> {error}</div>}
      {success && <div style={styles.successAlert}><strong>✅ Éxito:</strong> {success}</div>}

      <form onSubmit={handleCrearProceso} style={styles.form}>
        {/* Sección 1 */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>1. Detalles del Proceso de Selección</h3>
          <div style={styles.formGroup}>
            <label style={styles.label}>Código Único del Proceso</label>
            <input type="text" placeholder="Ej: LPI-001-2026" required value={codigo} onChange={e => setCodigo(e.target.value)} style={styles.input} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Objeto de Contratación (Título)</label>
            <input type="text" placeholder="Ej: Adquisición de Plataforma Cloud" required value={titulo} onChange={e => setTitulo(e.target.value)} style={styles.input} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Descripción del Alcance</label>
            <textarea placeholder="Resumen técnico..." value={descripcion} onChange={e => setDescripcion(e.target.value)} style={styles.textarea} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Fecha y Hora Límite de Cierre</label>
            <input type="datetime-local" required value={fechaCierre} onChange={e => setFechaCierre(e.target.value)} style={styles.input} />
          </div>
        </div>

        {/* Sección 2 */}
        <div style={styles.card}>
          <h3 style={{...styles.cardTitle, color: '#1e4620'}}>2. Términos de Referencia (TDR) Obligatorios</h3>
          <div style={styles.formGroup}>
            <label style={styles.label}>Título del Documento TDR</label>
            <input type="text" placeholder="Ej: Bases Integradas v1.0" required value={tituloTdr} onChange={e => setTituloTdr(e.target.value)} style={styles.input} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Ruta del Archivo PDF Firmado</label>
            <input type="text" placeholder="Ej: /documentos/tdr-firmado.pdf" required value={rutaTdr} onChange={e => setRutaTdr(e.target.value)} style={styles.input} />
          </div>
        </div>

        <button type="submit" style={styles.submitBtn}>Publicar Convocatoria Oficial</button>
      </form>
    </div>
  );
}

// Estilos modulares integrados en objetos JS
const styles = {
  container: { maxWidth: '750px', margin: '40px auto', padding: '0 20px', width: '100%' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' },
  mainTitle: { color: '#0f172a', fontSize: '24px', margin: '0 0 4px 0', fontWeight: '700' },
  subtitle: { color: '#64748b', margin: 0, fontSize: '14px' },
  logoutBtn: { backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  card: { backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0' },
  cardTitle: { margin: '0 0 16px 0', fontSize: '16px', color: '#1e3a8a', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', fontWeight: '600' },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '13px', color: '#334155' },
  input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '14px', color: '#333' },
  textarea: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '14px', minHeight: '80px', fontFamily: 'inherit', color: '#333' },
  submitBtn: { backgroundColor: '#2563eb', color: 'white', padding: '14px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: '600', boxShadow: '0 4px 6px -1px rgba(37,99,235,0.2)' },
  errorAlert: { backgroundColor: '#fef2f2', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', border: '1px solid #fee2e2', marginBottom: '16px', fontSize: '14px' },
  successAlert: { backgroundColor: '#f0fdf4', color: '#166534', padding: '12px 16px', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '16px', fontSize: '14px' }
};
