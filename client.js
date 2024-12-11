import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import App from'./pages/index'

// 水合原有的html，复用DOM
hydrateRoot(document.getElementById('root'), <App />)