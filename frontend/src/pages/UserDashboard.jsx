import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { procesosService, ofertasService } from '../services/procesosService';

export default function UserDashboard() {
  const navigate = useNavigate();
  const [procesos, setProcesos] = useState([]);
  const [procesoSeleccionado, setProcesoSeleccionado] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [rutaTecnica, setRutaTecnica] = useState('');
  const [rutaEconomica, setRutaEconomica] = useState('');
  const [rutaCv, setRutaCv] = useState('');
  const [nombreEspecialista, setNombreEspecialista] = useState('');
  const [cargoEspecialista, setCargoEspecialista] = useState('');
  const [experienciaEspecialista, setExperienciaEspecialista] = useState('');

  useEffect(() => {
    cargarConvocatorias();
  }, []);

  const cargarConvocatorias = async () => {
    try {
      const data = await procesosService.listarProcesos();
      setProcesos(data);
    } catch (err) {
      setError('Error al obtener los procesos vigentes del servidor.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleEnviarPostulacion = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    const payload = {
      proceso_id: procesoSeleccionado.id,
      postulante_id: 1,
      propuestas: [
        { tipo: 'tecnica', ruta_archivo: rutaTecnica },
        { tipo: 'economica', ruta_archivo: rutaEconomica }
      ],
      documentos: [{ tipo: 'CV', ruta_archivo: rutaCv }],
      personal_clave: [{ nombre: nombreEspecialista, cargo: cargoEspecialista, experiencia: experienciaEspecialista }]
    };

    try {
      await ofertasService.presentarOferta(payload);
      setSuccess(`¡Propuesta enviada con éxito para el proceso ${procesoSeleccionado.codigo}! 🚀`);
      setProcesoSeleccionado(null);
      setRutaTecnica(''); setRutaEconomica(''); setRutaCv('');
      setNombreEspecialista(''); setCargoEspecialista(''); setExperienciaEspecialista('');
      cargarConvocatorias();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al procesar la oferta.');
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.mainTitle}>🇵🇪 Portal del Proveedor del Estado</h1>
          <p style={styles.subtitle}>Plataforma GovTech — Presentación Digital de Propuestas</p>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>Cerrar Sesión 🚪</button>
      </header>

      {error && <div style={styles.errorAlert}><strong>⚠️ Alerta:</strong> {error}</div>}
      {success && <div style={styles.successAlert}><strong>✅ Éxito:</strong> {success}</div>}
      {!procesoSeleccionado ? (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Convocatorias Públicas Disponibles</h3>
          <div style={{overflowX: 'auto'}}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Código</th>
                  <th style={styles.th}>Objeto de Contratación</th>
                  <th style={styles.th}>Fecha Límite</th>
                  <th style={styles.th}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {procesos.map((p) => (
                  <tr key={p.id} style={styles.tr}>
                    <td style={{...styles.td, fontWeight: '700'}}>{p.codigo}</td>
                    <td style={styles.td}>
                      <div style={{fontWeight: '500'}}>{p.titulo}</div>
                      {p.tdr && <span style={styles.badge}>📄 TDR: {p.tdr.titulo}</span>}
                    </td>
                    <td style={styles.td}>{new Date(p.fecha_cierre).toLocaleString()}</td>
                    <td style={styles.td}>
                      <button onClick={() => setProcesoSeleccionado(p)} style={styles.tableBtn}>Postular</button>
                    </td>
                  </tr>
                ))}
                {procesos.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{textAlign: 'center', padding: '24px', color: '#64748b'}}>No hay procesos abiertos en este momento.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Formulario de Postulación: {procesoSeleccionado.codigo}</h3>
          <p style={{color: '#475569', marginBottom: '20px'}}><strong>Objeto:</strong> {procesoSeleccionado.titulo}</p>

          <form onSubmit={handleEnviarPostulacion} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            <div style={styles.rowGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Ruta Propuesta Técnica (PDF)</label>
                <input type="text" placeholder="Ej: /archivos/tecnica.pdf" required value={rutaTecnica} onChange={e => setRutaTecnica(e.target.value)} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Ruta Propuesta Económica (PDF)</label>
                <input type="text" placeholder="Ej: /archivos/economica.pdf" required value={rutaEconomica} onChange={e => setRutaEconomica(e.target.value)} style={styles.input} />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Ruta del Currículum Vitae (CV)</label>
              <input type="text" placeholder="Ej: /archivos/cv-empresa.pdf" required value={rutaCv} onChange={e => setRutaCv(e.target.value)} style={styles.input} />
            </div>

            <div style={styles.innerBox}>
              <h4 style={styles.innerBoxTitle}>Acreditación de Personal Clave</h4>
              <div style={styles.threeGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nombre Completo</label>
                  <input type="text" placeholder="Ej: Ing. Juan Pérez" required value={nombreEspecialista} onChange={e => setNombreEspecialista(e.target.value)} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Cargo Propuesto</label>
                  <input type="text" placeholder="Ej: Líder Técnico" required value={cargoEspecialista} onChange={e => setCargoEspecialista(e.target.value)} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Experiencia Certificada</label>
                  <input type="text" placeholder="Ej: 5 años" required value={experienciaEspecialista} onChange={e => setExperienciaEspecialista(e.target.value)} style={styles.input} />
                </div>
              </div>
            </div>

            <div style={{display: 'flex', gap: '12px', marginTop: '8px'}}>
              <button type="submit" style={styles.submitBtn}>Enviar Propuesta Oficial</button>
              <button type="button" onClick={() => setProcesoSeleccionado(null)} style={styles.cancelBtn}>Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// Estilos reutilizables compartidos
const styles = {
  container: { maxWidth: '900px', margin: '40px auto', padding: '0 20px', width: '100%' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' },
  mainTitle: { color: '#0f172a', fontSize: '24px', margin: '0 0 4px 0', fontWeight: '700' },
  subtitle: { color: '#64748b', margin: 0, fontSize: '14px' },
  logoutBtn: { backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  card: { backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
  cardTitle: { margin: '0 0 16px 0', fontSize: '16px', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', fontWeight: '600' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '8px' },
  thRow: { backgroundColor: '#f8f9fa', borderBottom: '2px solid #e2e8f0' },
  th: { padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#475569' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '12px', fontSize: '14px', color: '#334155' },
  badge: { display: 'inline-block', backgroundColor: '#eff6ff', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', marginTop: '4px', fontWeight: '500' },
  tableBtn: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  formGroup: { flex: 1 },
  label: { display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '13px', color: '#334155' },
  input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '14px', color: '#333' },
  rowGrid: { display: 'flex', gap: '16px' },
  threeGrid: { display: 'flex', gap: '12px' },
  innerBox: { backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' },
  innerBoxTitle: { margin: '0 0 12px 0', fontSize: '14px', color: '#334155', fontWeight: '600' },
  submitBtn: { backgroundColor: '#10b981', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  cancelBtn: { backgroundColor: '#64748b', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
  errorAlert: { backgroundColor: '#fef2f2', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', border: '1px solid #fee2e2', marginBottom: '16px', fontSize: '14px' },
  successAlert: { backgroundColor: '#f0fdf4', color: '#166534', padding: '12px 16px', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '16px', fontSize: '14px' }
};
