import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminPage from './AdminPage';
import App from './App';
import './index.css';

const isAdminPath = /^\/admin\/?$/.test(window.location.pathname);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{isAdminPath ? <AdminPage /> : <App />}</React.StrictMode>,
);
