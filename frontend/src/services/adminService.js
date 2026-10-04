import axios from 'axios';

const API_URL = '/api/auth/evaluadores';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const adminService = {
  listarEvaluadores: async () => {
    const response = await axios.get(API_URL, { headers: getAuthHeaders() });
    return response.data;
  },

  crearEvaluador: async (evaluador) => {
    const response = await axios.post(API_URL, evaluador, { headers: getAuthHeaders() });
    return response.data;
  },
};