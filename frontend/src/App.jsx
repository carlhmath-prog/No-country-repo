import React, { useState } from 'react';

function App() {
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const [registerData, setRegisterData] = useState({
    nombre_completo: '',
    email: '',
    password: '',
    rol: 'postulante',
  });

  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

  const handleRegisterChange = (e) => {
    setRegisterData({ ...registerData, [e.target.name]: e.target.value });
  };

  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setMensaje({ texto: '', tipo: '' });
    try {
      // CORREGIDO: Se cambió 127.0.0.1 por localhost para coincidir con el origen del navegador
      const response = await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData),
      });
      const data = await response.json();
      if (response.status === 201) {
        setMensaje({ texto: `¡Usuario creado con éxito! ID: ${data.id}`, tipo: 'success' });
        setRegisterData({ nombre_completo: '', email: '', password: '', rol: 'postulante' });
      } else {
        setMensaje({ texto: data.detail || 'Error en el registro.', tipo: 'error' });
      }
    } catch (error) {
      setMensaje({ texto: 'No se pudo conectar con el servidor.', tipo: 'error' });
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setMensaje({ texto: '', tipo: '' });
    try {
      // CORREGIDO: Se cambió 127.0.0.1 por localhost para coincidir con el origen del navegador
      const response = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });
      const data = await response.json();
      if (response.ok) {
        setMensaje({ texto: '¡Inicio de sesión exitoso! (Token guardado)', tipo: 'success' });
        console.log('JWT Token Recibido:', data.access_token);
      } else {
        setMensaje({ texto: data.detail || 'Credenciales incorrectas.', tipo: 'error' });
      }
    } catch (error) {
      setMensaje({ texto: 'No se pudo conectar con el servidor.', tipo: 'error' });
    }
  };

  const styles = {
    card: { maxWidth: '400px', margin: '60px auto', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontFamily: 'Arial, sans-serif', backgroundColor: '#fff', color: '#333' },
    tabs: { display: 'flex', marginBottom: '20px', borderBottom: '1px solid #ccc' },
    tab: (active) => ({ flex: 1, padding: '10px', textAlign: 'center', cursor: 'pointer', fontWeight: 'bold', borderBottom: active ? '3px solid #007bff' : 'none', color: active ? '#007bff' : '#666' }),
    formGroup: { marginBottom: '15px' },
    label: { display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555', textAlign: 'left' },
    input: { width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' },
    button: { width: '100%', padding: '10px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer' },
    message: (tipo) => ({ marginTop: '15px', textAlign: 'center', fontWeight: 'bold', color: tipo === 'success' ? 'green' : 'red' })
  };

  return (
    <div style={styles.card}>
      <div style={styles.tabs}>
        <div style={styles.tab(isLoginTab)} onClick={() => { setIsLoginTab(true); setMensaje({texto:'', tipo:''}); }}>Login</div>
        <div style={styles.tab(!isLoginTab)} onClick={() => { setIsLoginTab(false); setMensaje({texto:'', tipo:''}); }}>Registro</div>
      </div>

      {isLoginTab ? (
        <form onSubmit={handleLoginSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Correo Electrónico</label>
            <input type="email" name="email" value={loginData.email} onChange={handleLoginChange} required style={styles.input} placeholder="user@example.com" />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Contraseña</label>
            <input type="password" name="password" value={loginData.password} onChange={handleLoginChange} required style={styles.input} placeholder="********" />
          </div>
          <button type="submit" style={styles.button}>Ingresar</button>
        </form>
      ) : (
        <form onSubmit={handleRegisterSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Nombre Completo</label>
            <input type="text" name="nombre_completo" value={registerData.nombre_completo} onChange={handleRegisterChange} required style={styles.input} placeholder="Ej. Juan Pérez" />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Correo Electrónico</label>
            <input type="email" name="email" value={registerData.email} onChange={handleRegisterChange} required style={styles.input} placeholder="user@example.com" />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Contraseña</label>
            <input type="password" name="password" value={registerData.password} onChange={handleRegisterChange} required style={styles.input} placeholder="********" />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Rol</label>
            <select name="rol" value={registerData.rol} onChange={handleRegisterChange} style={styles.input}>
              <option value="postulante">Postulante</option>
              <option value="administrador">Administrador</option>
            </select>
          </div>
          <button type="submit" style={styles.button}>Registrarse</button>
        </form>
      )}

      {mensaje.texto && (
        <div style={styles.message(mensaje.tipo)}>
          {mensaje.texto}
        </div>
      )}
    </div>
  );
}

export default App;