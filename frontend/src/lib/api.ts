import axios, { AxiosError } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { access_token } = response.data;
    localStorage.setItem('token', access_token);
    return response.data;
  },

  register: async (email: string, password: string) => {
    const response = await api.post('/auth/register', { email, password });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
};

// ZIP Code Lists API
export const zipListsApi = {
  getLists: async () => {
    const response = await api.get('/zipcodes/lists');
    return response.data;
  },

  getList: async (id: number) => {
    const response = await api.get(`/zipcodes/lists/${id}`);
    return response.data;
  },

  createList: async (data: { name: string; description?: string; zipCodes: string[] }) => {
    const response = await api.post('/zipcodes/lists', data);
    return response.data;
  },

  updateList: async (id: number, data: { name?: string; description?: string }) => {
    const response = await api.put(`/zipcodes/lists/${id}`, data);
    return response.data;
  },

  deleteList: async (id: number) => {
    await api.delete(`/zipcodes/lists/${id}`);
  },

  addZipCode: async (listId: number, zipCode: string) => {
    const response = await api.post(`/zipcodes/lists/${listId}/codes`, { zipCode });
    return response.data;
  },

  removeZipCode: async (listId: number, zipCode: string) => {
    await api.delete(`/zipcodes/lists/${listId}/codes/${zipCode}`);
  }
};

// ZIP Code Comparison API
export const compareApi = {
  compareLists: async (list1Id: number, list2Id: number) => {
    const response = await api.post(`/zipcodes/compare?list1_id=${list1Id}&list2_id=${list2Id}`);
    return response.data;
  }
}; 