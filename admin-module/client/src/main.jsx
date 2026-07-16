import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App.jsx';

const devBaseUrl = 'http://localhost:5000';
const prodBaseUrl = 'https://marvelous-torte-880f33.netlify.app';

const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1';

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || 
                         (isLocal ? devBaseUrl : prodBaseUrl);

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
