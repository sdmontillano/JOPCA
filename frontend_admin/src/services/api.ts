import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api', // adjust to your Django REST endpoint
});

export default api;