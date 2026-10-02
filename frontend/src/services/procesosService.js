import axios from 'axios';

const API_URL = 'http://localhost:8000';

// Función para recuperar el token JWT del almacenamiento local
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const procesosService = {
  /**
   * Obtiene todas las convocatorias públicas vigentes en el sistema.
   */
  listarProcesos: async () => {
    const response = await axios.get(`${API_URL}/procesos`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  /**
   * Registra un nuevo proceso de selección junto con su TDR.
   * Requerido para el rol de Entidad Contratante.
   */
  crearProceso: async (procesoData) => {
    const response = await axios.post(`${API_URL}/procesos/`, procesoData, {
      headers: getAuthHeaders()
    });
    return response.data;
  }
};

export const ofertasService = {
  /**
   * Envía la postulación técnica, económica y personal clave de un proveedor.
   * Pasa por las validaciones del Motor de Reglas del Backend.
   */
  presentarOferta: async (ofertaData) => {
    const response = await axios.post(`${API_URL}/ofertas/`, ofertaData, {
      headers: getAuthHeaders()
    });
    return response.data;
  }
};
