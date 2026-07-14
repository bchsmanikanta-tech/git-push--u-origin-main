import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App.jsx';

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || '/';
axios.interceptors.request.use((config) => {
  if (config.url?.startsWith('http://localhost:5000')) {
    config.url = config.url.replace('http://localhost:5000', '');
  }
  return config;
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
