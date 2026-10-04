import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { procesosService, ofertasService, postulantesService } from '../services/procesosService';

export default function UserDashboard() {
  const navigate = useNavigate();
  const [procesos, setProcesos] = useState([]);
  const [procesoSeleccionado, setProcesoSeleccionado] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [perfilPostulante, setPerfilPostulante] = useState(null);
  const [perfilCargado, setPerfilCargado] = useState(false);
  const [perfilForm, setPerfilForm] = useState({ razon_social: '', ruc: '' });

  const [rutaTecnica, setRutaTecnica] = useState('');
  const [rutaEconomica, setRutaEconomica] = useState('');
  const [rutaCv, setRutaCv] = useState('');
  const [nombreEspecialista, setNombreEspecialista] = useState('');
  const [cargoEspecialista, setCargoEspecialista] = useState('');
  const [experienciaEspecialista, setExperienciaEspecialista] = useState('');

  const cargarConvocatorias = useCallback(
    () => procesosService.listarProcesos(),
    []
  );

  useEffect(() => {
    let isActive = true;
    cargarConvocatorias()
      .then((data) => {
        if (isActive) setProcesos(data);
      })
      .catch(() => {
        if (isActive) setError('Error al obtener los procesos vigentes del servidor.');
      });

    return () => {
      isActive = false;
    };
  }, [cargarConvocatorias]);

  useEffect(() => {
    let isActive = true;
    postulantesService.obtenerMiPerfil()
      .then((perfil) => {
        if (isActive) setPerfilPostulante(perfil);
      })
      .catch((requestError) => {
        if (isActive) {
          setError(requestError.response?.data?.detail || 'No se pudo cargar el perfil.');
        }
      })
      .finally(() => {
        if (isActive) setPerfilCargado(true);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleGuardarPerfil = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const perfil = await postulantesService.guardarMiPerfil(perfilForm);
      setPerfilPostulante(perfil);
      setSuccess('Perfil de postulante guardado.');
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'No se pudo guardar el perfil.');
    }
  };

  const handleEnviarPostulacion = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    const payload = {
      proceso_id: procesoSeleccionado.id,
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
      setProcesos(await cargarConvocatorias());
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al procesar la oferta.');
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.mainTitle}>Espacio de postulante</h1>
          <p style={styles.subtitle}>Plataforma GovTech — Presentación Digital de Propuestas</p>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>Cerrar sesión</button>
      </header>

      {error && <div style={styles.errorAlert}><strong>⚠️ Alerta:</strong> {error}</div>}
      {success && <div style={styles.successAlert}><strong>✅ Éxito:</strong> {success}</div>}
      {!perfilCargado && (
        <div style={styles.card}>Cargando perfil...</div>
      )}
      {perfilCargado && !perfilPostulante && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Completa tu perfil de postulante</h3>
          <p style={styles.subtitle}>Necesitamos los datos de tu empresa para asociar correctamente tus ofertas.</p>
          <form onSubmit={handleGuardarPerfil} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            <div style={styles.formGroup}>
              <label htmlFor="razon_social" style={styles.label}>Razón social</label>
              <input
                id="razon_social"
                type="text"
                required
                minLength="2"
                maxLength="255"
                value={perfilForm.razon_social}
                onChange={(e) => setPerfilForm({ ...perfilForm, razon_social: e.target.value })}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label htmlFor="ruc" style={styles.label}>RUC (11 dígitos)</label>
              <input
                id="ruc"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{11}"
                maxLength="11"
                required
                value={perfilForm.ruc}
                onChange={(e) => setPerfilForm({ ...perfilForm, ruc: e.target.value })}
                style={styles.input}
              />
            </div>
            <button type="submit" style={styles.submitBtn}>Guardar perfil</button>
          </form>
        </div>
      )}
      {perfilPostulante && (!procesoSeleccionado ? (
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
      ))}
    </div>
  );
}

// Estilos reutilizables compartidos
const styles = {
  container: { maxWidth: '1120px', margin: '32px auto', padding: '0 24px', width: '100%' },
  header: { display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cbd4cd', paddingBottom: '18px', marginBottom: '24px' },
  mainTitle: { color: '#1c2e27', fontSize: '24px', margin: '0 0 4px 0', fontWeight: '700' },
  subtitle: { color: '#65736d', margin: 0, fontSize: '14px' },
  logoutBtn: { backgroundColor: '#fff', color: '#344a40', border: '1px solid #9eaaa2', padding: '8px 14px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  card: { backgroundColor: '#ffffff', padding: '22px', borderRadius: '6px', border: '1px solid #d5ddd7' },
  cardTitle: { margin: '0 0 16px 0', fontSize: '17px', color: '#1c2e27', borderBottom: '1px solid #e4e9e5', paddingBottom: '10px', fontWeight: '700' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '8px' },
  thRow: { backgroundColor: '#f1f4f1', borderBottom: '1px solid #cbd4cd' },
  th: { padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '700', color: '#344a40' },
  tr: { borderBottom: '1px solid #e4e9e5' },
  td: { padding: '12px', fontSize: '14px', color: '#344a40' },
  badge: { display: 'inline-block', backgroundColor: '#eaf4ee', color: '#185640', padding: '3px 8px', borderRadius: '3px', fontSize: '11px', marginTop: '4px', fontWeight: '600' },
  tableBtn: { backgroundColor: '#176b57', color: 'white', border: 'none', padding: '7px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' },
  formGroup: { flex: 1 },
  label: { display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '13px', color: '#334155' },
  input: { width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #c3cec6', boxSizing: 'border-box', fontSize: '14px', color: '#1c2e27', background: '#fff' },
  rowGrid: { display: 'flex', flexWrap: 'wrap', gap: '16px' },
  threeGrid: { display: 'flex', flexWrap: 'wrap', gap: '12px' },
  innerBox: { backgroundColor: '#f4f6f3', padding: '16px', borderRadius: '4px', border: '1px solid #d5ddd7' },
  innerBoxTitle: { margin: '0 0 12px 0', fontSize: '14px', color: '#334155', fontWeight: '600' },
  submitBtn: { backgroundColor: '#176b57', color: 'white', padding: '12px 18px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '700' },
  cancelBtn: { backgroundColor: '#fff', color: '#344a40', padding: '12px 18px', border: '1px solid #9eaaa2', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' },
  errorAlert: { backgroundColor: '#faeeee', color: '#762020', padding: '12px 16px', borderRadius: '4px', border: '1px solid #e9caca', marginBottom: '16px', fontSize: '14px' },
  successAlert: { backgroundColor: '#eaf4ee', color: '#185640', padding: '12px 16px', borderRadius: '4px', border: '1px solid #c1dacb', marginBottom: '16px', fontSize: '14px' }
};
