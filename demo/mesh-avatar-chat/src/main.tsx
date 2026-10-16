import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// Caches the voice files after their first download (see public/sw.js).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`)
    .catch((error) =>
      console.warn('Service worker registration failed:', error),
    );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
