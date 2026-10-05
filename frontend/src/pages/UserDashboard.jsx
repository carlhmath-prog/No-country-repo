import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { procesosService, ofertasService, postulantesService } from '../services/procesosService';
import AssistantChat from '../components/AssistantChat';

export default function UserDashboard() {
  const navigate = useNavigate();
  const [procesos, setProcesos] = useState([]);
  const [procesoSeleccionado, setProcesoSeleccionado] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [perfilPostulante, setPerfilPostulante] = useState(null);
  const [perfilCargado, setPerfilCargado] = useState(false);
  const [perfilForm, setPerfilForm] = useState({ razon_social: '', ruc: '' });
  const [misOfertas, setMisOfertas] = useState([]);
  const [ofertasCargadas, setOfertasCargadas] = useState(false);

  const [archivoTecnico, setArchivoTecnico] = useState(null);
  const [archivoEconomico, setArchivoEconomico] = useState(null);
  const [archivoCv, setArchivoCv] = useState(null);
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
        if (isActive) setError('No se pudieron cargar los procesos. Comprueba que el backend esté activo e inténtalo de nuevo.');
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

  const cargarMisOfertas = useCallback(async () => {
    const ofertas = await ofertasService.listarMisOfertas();
    setMisOfertas(ofertas);
    setOfertasCargadas(true);
  }, []);

  useEffect(() => {
    let isActive = true;
    ofertasService.listarMisOfertas()
      .then((ofertas) => {
        if (isActive) setMisOfertas(ofertas);
      })
      .catch((requestError) => {
        if (isActive) setError(requestError.response?.data?.detail || 'No se pudieron cargar tus postulaciones.');
      })
      .finally(() => {
        if (isActive) setOfertasCargadas(true);
      });
    return () => { isActive = false; };
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
    if (!archivoTecnico || !archivoEconomico || !archivoCv) {
      setError('Adjunta la propuesta técnica, la económica y el CV en formato PDF.');
      return;
    }

    try {
      const [rutaTecnica, rutaEconomica, rutaCv] = await Promise.all([
        ofertasService.subirDocumento(archivoTecnico),
        ofertasService.subirDocumento(archivoEconomico),
        ofertasService.subirDocumento(archivoCv),
      ]);
      const payload = {
        proceso_id: procesoSeleccionado.id,
        propuestas: [
          { tipo: 'tecnica', ruta_archivo: rutaTecnica },
          { tipo: 'economica', ruta_archivo: rutaEconomica }
        ],
        documentos: [{ tipo: 'CV', ruta_archivo: rutaCv }],
        personal_clave: [{ nombre: nombreEspecialista, cargo: cargoEspecialista, experiencia: experienciaEspecialista }]
      };
      const ofertaRegistrada = await ofertasService.presentarOferta(payload);
      setMisOfertas((current) => [ofertaRegistrada, ...current]);
      setSuccess(`¡Propuesta enviada con éxito para el proceso ${procesoSeleccionado.codigo}! 🚀`);
      setProcesoSeleccionado(null);
      setArchivoTecnico(null); setArchivoEconomico(null); setArchivoCv(null);
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
      <AssistantChat />
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
      {perfilCargado && perfilPostulante && (
        <section style={styles.card}>
          <h3 style={styles.cardTitle}>Perfil de postulante guardado</h3>
          <p><strong>Razón social:</strong> {perfilPostulante.razon_social}</p>
          <p><strong>RUC:</strong> {perfilPostulante.ruc}</p>
          <p><strong>Correo:</strong> {perfilPostulante.correo}</p>
        </section>
      )}
      {perfilCargado && perfilPostulante && (
        <section style={styles.card}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px'}}>
            <h3 style={styles.cardTitle}>Mis postulaciones</h3>
            <button type="button" onClick={() => cargarMisOfertas().catch((requestError) => setError(requestError.response?.data?.detail || 'No se pudieron actualizar tus postulaciones.'))} style={styles.tableBtn}>Actualizar</button>
          </div>
          {!ofertasCargadas ? <p style={styles.subtitle}>Cargando postulaciones...</p> : misOfertas.length === 0 ? (
            <p style={styles.subtitle}>Todavía no has presentado ofertas. Las postulaciones enviadas aparecerán aquí aunque el análisis con IA no esté configurado.</p>
          ) : (
            <div style={{overflowX: 'auto'}}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>Proceso</th>
                    <th style={styles.th}>Fecha de envío</th>
                    <th style={styles.th}>Estado</th>
                    <th style={styles.th}>Documentos registrados</th>
                  </tr>
                </thead>
                <tbody>
                  {misOfertas.map((oferta) => (
                    <tr key={oferta.id} style={styles.tr}>
                      <td style={styles.td}>
                        <strong>{oferta.proceso.codigo}</strong>
                        <div>{oferta.proceso.titulo}</div>
                        <small>Oferta #{oferta.id}</small>
                      </td>
                      <td style={styles.td}>{new Date(oferta.fecha_presentacion).toLocaleString()}</td>
                      <td style={styles.td}>{oferta.estado}</td>
                      <td style={styles.td}>
                        {[...oferta.propuestas, ...oferta.documentos].map((documento) => (
                          <div key={`${documento.tipo}-${documento.id}`}>{documento.tipo} ✓</div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      {perfilPostulante && (!procesoSeleccionado ? (
        <div style={styles.card}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px'}}>
            <h3 style={styles.cardTitle}>Convocatorias públicas vigentes</h3>
            <button type="button" onClick={() => cargarConvocatorias().then(setProcesos).catch(() => setError('No se pudieron actualizar los procesos. Comprueba que el backend esté activo.'))} style={styles.tableBtn}>Actualizar</button>
          </div>
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
                <label style={styles.label}>Propuesta Técnica (PDF, máximo 15 MB)</label>
                <input type="file" accept="application/pdf,.pdf" required onChange={e => setArchivoTecnico(e.target.files?.[0] || null)} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Propuesta Económica (PDF, máximo 15 MB)</label>
                <input type="file" accept="application/pdf,.pdf" required onChange={e => setArchivoEconomico(e.target.files?.[0] || null)} style={styles.input} />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Currículum Vitae (PDF, máximo 15 MB)</label>
              <input type="file" accept="application/pdf,.pdf" required onChange={e => setArchivoCv(e.target.files?.[0] || null)} style={styles.input} />
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
