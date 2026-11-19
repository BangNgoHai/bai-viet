import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initSocket } from './store';
import './index.css';

initSocket();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
