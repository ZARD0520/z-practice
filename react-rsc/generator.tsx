import React from 'react'
import { renderToString } from 'react-dom/server'
import { renderJSXToClientJSX, stringifyJSX } from './utils'
import { Layout, IndexPage, PostPage } from './components'
import { renderToPipeableStream } from "react-server-dom-webpack/server.node"

export async function htmlGenerator(url) {
  let jsx = <Router url={url} />
  // 获取当前页面的客户端 JSX 对象
  const clientJSX = await renderJSXToClientJSX(jsx);
  let html = await renderToString(clientJSX);
  // 拼接到脚本代码中
  const clientJSXString = JSON.stringify(clientJSX, stringifyJSX);
  html += `<script>window.__INITIAL_CLIENT_JSX_STRING__ = `;
  html += JSON.stringify(clientJSXString).replace(/</g, "\\u003c");
  html += `</script>`;
  html += `
  <script type="importmap">
    {
      "imports": {
        "react": "https://esm.sh/react@18.2.0",
        "react-dom/client": "https://esm.sh/react-dom@18.2.0/client?dev"
      }
    }
  </script>
  <script type="module" src="/client.js"></script>
`
  return html
}

function Router({ url }) {
  let page;
  if (url.pathname === "/") {
    page = <IndexPage />;
  } else {
    const slug = url.pathname.slice(1);
    page = <PostPage slug={slug} />;
  }
  return <Layout>{page}</Layout>;
}

export function jsxGenerator(url) {
  return renderToPipeableStream(<Router url={url} />)
}