
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ofertasService, procesosService } from '../services/procesosService';
import AssistantChat from '../components/AssistantChat';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [entidadNombre, setEntidadNombre] = useState('');
  const [entidadRuc, setEntidadRuc] = useState('');
  const [entidadDireccion, setEntidadDireccion] = useState('');
  const [fechaCierre, setFechaCierre] = useState('');
  const [tituloTdr, setTituloTdr] = useState('');
  const [archivoTdr, setArchivoTdr] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ofertas, setOfertas] = useState([]);
  const [errorOfertas, setErrorOfertas] = useState('');
  const [successOfertas, setSuccessOfertas] = useState('');
  const [analizandoOferta, setAnalizandoOferta] = useState(null);

  const cargarOfertas = useCallback(async () => {
    try {
      setOfertas(await ofertasService.listarOfertas());
      setErrorOfertas('');
    } catch (requestError) {
      setErrorOfertas(requestError.response?.data?.detail || 'No se pudieron cargar las postulaciones.');
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    ofertasService.listarOfertas()
      .then((data) => {
        if (isActive) setOfertas(data);
      })
      .catch((requestError) => {
        if (isActive) setErrorOfertas(requestError.response?.data?.detail || 'No se pudieron cargar las postulaciones.');
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

  const handleCrearProceso = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const form = e.currentTarget;

    // 🛡️ Validación de seguridad: Verifica que la fecha exista y sea válida
    const objetoFecha = new Date(fechaCierre);
    if (!fechaCierre || isNaN(objetoFecha.getTime())) {
      setError('Por favor, ingrese una fecha y hora límite de cierre válida.');
      return;
    }
    if (!archivoTdr) {
      setError('Selecciona el archivo PDF del TDR.');
      return;
    }

    try {
      const rutaTdr = await procesosService.subirTdr(archivoTdr);
      const payload = {
        codigo,
        titulo,
        descripcion,
        fecha_cierre: objetoFecha.toISOString(),
        entidad: {
          nombre: entidadNombre,
          ruc: entidadRuc,
          direccion: entidadDireccion || null
        },
        tdr: {
          version: "1.0",
          titulo: tituloTdr,
          descripcion: "TDR oficial digitalizado para el proceso",
          ruta_archivo: rutaTdr
        }
      };

      await procesosService.crearProceso(payload);
      setSuccess(`¡Convocatoria ${codigo} publicada con éxito! 🏛️`);
      setCodigo(''); setTitulo(''); setDescripcion(''); setFechaCierre(''); setTituloTdr(''); setArchivoTdr(null);
      setEntidadNombre(''); setEntidadRuc(''); setEntidadDireccion('');
      form.reset();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al publicar la convocatoria.');
    }
  };

  const handleAnalizarOferta = async (oferta) => {
    setAnalizandoOferta(oferta.id);
    setErrorOfertas('');
    setSuccessOfertas('');
    try {
      const analisis = await ofertasService.analizarOferta(oferta.id);
      setOfertas((current) => current.map((item) => item.id === oferta.id
        ? { ...item, analisis_ia: [analisis, ...(item.analisis_ia || [])] }
        : item));
      setSuccessOfertas(`Análisis IA de la oferta #${oferta.id} completado. Revisa los hallazgos antes de decidir.`);
    } catch (requestError) {
      setErrorOfertas(requestError.response?.data?.detail || 'No se pudo analizar la oferta.');
    } finally {
      setAnalizandoOferta(null);
    }
  };

  const handleEvaluarOferta = async (e, oferta) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      const evaluacion = await ofertasService.evaluarOferta(oferta.id, {
        estado: formData.get('estado'),
        puntaje_total: Number(formData.get('puntaje_total')),
        observaciones: formData.get('observaciones') || null,
      });
      setOfertas((current) => current.map((item) => item.id === oferta.id
        ? { ...item, evaluaciones: [...(item.evaluaciones || []).filter((entry) => entry.usuario_id !== evaluacion.usuario_id), evaluacion] }
        : item));
      setSuccessOfertas(`Evaluación de la oferta #${oferta.id} guardada.`);
    } catch (requestError) {
      setErrorOfertas(requestError.response?.data?.detail || 'No se pudo guardar la evaluación.');
    }
  };


  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.mainTitle}>🏛️ Sistema de Contrataciones Estatales</h1>
          <p style={styles.subtitle}>Panel de evaluador · Procesos y postulaciones</p>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>Cerrar Sesión 🚪</button>
      </header>

      {error && <div style={styles.errorAlert}><strong>⚠️ Sistema:</strong> {error}</div>}
      {success && <div style={styles.successAlert}><strong>✅ Éxito:</strong> {success}</div>}

      <AssistantChat />

      <section style={{...styles.card, marginBottom: '20px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h2 style={styles.cardTitle}>Revisión de postulaciones</h2>
          <button type="button" onClick={cargarOfertas} style={styles.tableBtn}>Actualizar</button>
        </div>
        {errorOfertas && <div style={styles.errorAlert}>{errorOfertas}</div>}
        {successOfertas && <div style={styles.successAlert} role="status">{successOfertas}</div>}
        <p style={styles.subtitle}>El análisis IA envía el TDR y los PDF de la oferta a OpenAI. Úsalo como apoyo: verifica evidencias y toma la decisión final como evaluador.</p>
        {ofertas.length === 0 ? <p style={styles.subtitle}>No hay postulaciones para revisar.</p> : (
          <div style={{overflowX: 'auto'}}>
            <table style={styles.table}>
              <thead><tr style={styles.thRow}>
                <th style={styles.th}>Oferta</th><th style={styles.th}>Proceso</th><th style={styles.th}>Postulante</th><th style={styles.th}>Evaluación</th>
              </tr></thead>
              <tbody>{ofertas.map((oferta) => (
                <tr key={oferta.id} style={styles.tr}>
                  <td style={styles.td}>#{oferta.id}</td>
                  <td style={styles.td}>
                    <strong>{oferta.proceso.codigo}</strong>
                    <div>{oferta.proceso.titulo}</div>
                  </td>
                  <td style={styles.td}>
                    <strong>{oferta.postulante.razon_social}</strong>
                    <div>RUC: {oferta.postulante.ruc}</div>
                    <div>{oferta.postulante.correo}</div>
                  </td>
                  <td style={styles.td}>
                    <button type="button" disabled={analizandoOferta === oferta.id} onClick={() => handleAnalizarOferta(oferta)} style={styles.tableBtn}>
                      {analizandoOferta === oferta.id ? 'Analizando…' : 'Analizar con IA'}
                    </button>
                    {oferta.analisis_ia?.[0] && (
                      <div style={styles.aiResult}>
                        <strong>Análisis asistido · {oferta.analisis_ia[0].resultado.estado_general}</strong>
                        <p>{oferta.analisis_ia[0].resultado.resumen}</p>
                        <ul>
                          {oferta.analisis_ia[0].resultado.hallazgos.map((hallazgo, index) => (
                            <li key={`${hallazgo.requisito}-${index}`}>
                              <strong>{hallazgo.estado}:</strong> {hallazgo.requisito}
                              {hallazgo.evidencia && <div>Evidencia: “{hallazgo.evidencia}” ({hallazgo.documento})</div>}
                            </li>
                          ))}
                        </ul>
                        <small>Resultado orientativo; la decisión final corresponde al evaluador.</small>
                      </div>
                    )}
                    <form onSubmit={(event) => handleEvaluarOferta(event, oferta)} style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                      <select name="estado" defaultValue={oferta.evaluaciones?.[0]?.estado || 'observada'} style={styles.input}>
                        <option value="aprobada">Aprobada</option>
                        <option value="observada">Observada</option>
                        <option value="rechazada">Rechazada</option>
                      </select>
                      <input name="puntaje_total" type="number" min="0" max="100" step="0.01" defaultValue={oferta.evaluaciones?.[0]?.puntaje_total || 0} required style={{...styles.input, maxWidth: '100px'}} />
                      <input name="observaciones" type="text" placeholder="Observaciones" defaultValue={oferta.evaluaciones?.[0]?.observaciones || ''} style={{...styles.input, minWidth: '180px'}} />
                      <button type="submit" style={styles.tableBtn}>Guardar evaluación</button>
                    </form>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

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
            <label style={styles.label}>Entidad contratante</label>
            <input type="text" placeholder="Nombre de la entidad" required maxLength="255" value={entidadNombre} onChange={e => setEntidadNombre(e.target.value)} style={styles.input} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>RUC de la entidad (11 dígitos)</label>
            <input type="text" inputMode="numeric" pattern="[0-9]{11}" maxLength="11" required value={entidadRuc} onChange={e => setEntidadRuc(e.target.value)} style={styles.input} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Dirección de la entidad (opcional)</label>
            <input type="text" maxLength="255" value={entidadDireccion} onChange={e => setEntidadDireccion(e.target.value)} style={styles.input} />
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
            <label style={styles.label}>Archivo PDF del TDR (máximo 15 MB)</label>
            <input type="file" accept="application/pdf,.pdf" required onChange={(e) => setArchivoTdr(e.target.files?.[0] || null)} style={styles.input} />
          </div>
        </div>

        <button type="submit" style={styles.submitBtn}>Publicar Convocatoria Oficial</button>
      </form>
    </div>
  );
}

// Estilos modulares integrados en objetos JS
const styles = {
  container: { maxWidth: '1120px', margin: '32px auto', padding: '0 24px', width: '100%' },
  header: { display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cbd4cd', paddingBottom: '18px', marginBottom: '24px' },
  mainTitle: { color: '#1c2e27', fontSize: '24px', margin: '0 0 4px 0', fontWeight: '700' },
  subtitle: { color: '#65736d', margin: 0, fontSize: '14px' },
  logoutBtn: { backgroundColor: '#fff', color: '#344a40', border: '1px solid #9eaaa2', padding: '8px 14px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  card: { backgroundColor: '#ffffff', padding: '22px', borderRadius: '6px', border: '1px solid #d5ddd7' },
  cardTitle: { margin: '0 0 16px 0', fontSize: '17px', color: '#1c2e27', borderBottom: '1px solid #e4e9e5', paddingBottom: '10px', fontWeight: '700' },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '13px', color: '#334155' },
  input: { width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #c3cec6', boxSizing: 'border-box', fontSize: '14px', color: '#1c2e27', background: '#fff' },
  textarea: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '14px', minHeight: '80px', fontFamily: 'inherit', color: '#333' },
  submitBtn: { backgroundColor: '#176b57', color: 'white', padding: '13px 18px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '700' },
  errorAlert: { backgroundColor: '#faeeee', color: '#762020', padding: '12px 16px', borderRadius: '4px', border: '1px solid #e9caca', marginBottom: '16px', fontSize: '14px' },
  successAlert: { backgroundColor: '#eaf4ee', color: '#185640', padding: '12px 16px', borderRadius: '4px', border: '1px solid #c1dacb', marginBottom: '16px', fontSize: '14px' },
  aiResult: { marginTop: '12px', padding: '12px', background: '#f4f6f3', borderRadius: '4px', fontSize: '13px', minWidth: '260px' }
};
