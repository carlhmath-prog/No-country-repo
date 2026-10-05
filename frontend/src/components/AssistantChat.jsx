import { useEffect, useState } from 'react';
import { assistantService, procesosService } from '../services/procesosService';

export default function AssistantChat() {
  const [procesos, setProcesos] = useState([]);
  const [procesoId, setProcesoId] = useState('');
  const [pregunta, setPregunta] = useState('');
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    procesosService.listarProcesos()
      .then((data) => {
        if (activo) {
          const availableProcesses = data.filter((process) => process.estado === 'publicado');
          setProcesos(availableProcesses);
          if (availableProcesses.length) setProcesoId(String(availableProcesses[0].id));
        }
      })
      .catch((requestError) => {
        if (activo) setError(requestError.response?.data?.detail || 'No se pudieron cargar los procesos.');
      });
    return () => { activo = false; };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!procesoId || !pregunta.trim()) return;
    const question = pregunta.trim();
    setMensajes((current) => [...current, { role: 'user', content: question }]);
    setPregunta('');
    setCargando(true);
    setError('');
    try {
      const result = await assistantService.preguntar(Number(procesoId), question);
      setMensajes((current) => [...current, { role: 'assistant', ...result }]);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'El asistente no pudo procesar la pregunta.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <section style={styles.container} aria-labelledby="assistant-title">
      <h2 id="assistant-title" style={styles.title}>Asistente de contratación</h2>
      <p style={styles.description}>
        Consulta el TDR y, según tu rol, los documentos de las ofertas a las que tienes acceso.
        Las respuestas se basan en fuentes citadas y no reemplazan una evaluación formal.
      </p>
      <label style={styles.label} htmlFor="assistant-process">Proceso</label>
      <select id="assistant-process" value={procesoId} onChange={(event) => setProcesoId(event.target.value)} style={styles.input}>
        <option value="">Selecciona un proceso</option>
        {procesos.map((proceso) => (
          <option key={proceso.id} value={proceso.id}>{proceso.codigo} — {proceso.titulo}</option>
        ))}
      </select>
      <div aria-live="polite" style={styles.messages}>
        {mensajes.map((message, index) => (
          <article key={`${message.role}-${index}`} style={styles.message}>
            <strong>{message.role === 'user' ? 'Tú' : 'Asistente'}</strong>
            <p>{message.role === 'user' ? message.content : message.respuesta}</p>
            {message.citas?.length > 0 && (
              <ul style={styles.citations}>
                {message.citas.map((citation, citationIndex) => (
                  <li key={`${citation.documento}-${citation.pagina}-${citationIndex}`}>
                    {citation.documento}, página {citation.pagina}
                    {citation.oferta_id ? ` (oferta ${citation.oferta_id})` : ''}
                  </li>
                ))}
              </ul>
            )}
            {message.modelo && <small>Modelo: {message.modelo}</small>}
          </article>
        ))}
        {cargando && <p role="status">Consultando documentos…</p>}
      </div>
      {error && <p role="alert" style={styles.error}>{error}</p>}
      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label} htmlFor="assistant-question">Pregunta sobre el proceso</label>
        <textarea
          id="assistant-question"
          required
          minLength="3"
          maxLength="2000"
          value={pregunta}
          onChange={(event) => setPregunta(event.target.value)}
          placeholder="¿Qué documentos se requieren para acreditar la experiencia?"
          style={styles.textarea}
        />
        <button type="submit" disabled={cargando || !procesoId} style={styles.button}>
          {cargando ? 'Consultando…' : 'Preguntar'}
        </button>
      </form>
    </section>
  );
}

const styles = {
  container: { margin: '0 0 20px', padding: '22px', border: '1px solid #d5ddd7', borderRadius: '6px', background: '#fff' },
  title: { margin: '0 0 8px', fontSize: '18px' },
  description: { color: '#596575', fontSize: '14px', lineHeight: 1.5 },
  label: { display: 'block', margin: '12px 0 6px', fontWeight: 600, fontSize: '14px' },
  input: { width: '100%', padding: '10px', border: '1px solid #aeb8c4', borderRadius: '4px', background: '#fff' },
  messages: { maxHeight: '340px', overflowY: 'auto', marginTop: '12px' },
  message: { margin: '10px 0', padding: '12px', background: '#f4f6f3', borderRadius: '4px', overflowWrap: 'anywhere' },
  citations: { paddingLeft: '20px', fontSize: '13px' },
  form: { display: 'grid', gap: '8px' },
  textarea: { width: '100%', minHeight: '76px', padding: '10px', border: '1px solid #aeb8c4', borderRadius: '4px', resize: 'vertical' },
  button: { justifySelf: 'start', minHeight: '40px', padding: '0 16px', border: 0, borderRadius: '4px', color: '#fff', background: '#176b57', cursor: 'pointer' },
  error: { color: '#9c2424' }
};
