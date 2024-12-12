import React from 'react';
import { hydrateRoot } from 'react-dom/client';

const { props, page } = window.__DATA__

// 动态加载
const importFile = async (path) => {
  return await import (`./pages/${path}.js`)
}

const data = await importFile(page)
const Component = data.default

// 水合原有的html，复用DOM
hydrateRoot(document.getElementById('root'), <Component {...props}/>)