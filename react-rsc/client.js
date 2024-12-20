import * as React from "react"
import { use, useState, startTransition } from "react"
import { createFromFetch } from "react-server-dom-webpack"
import { hydrateRoot, createRoot } from 'react-dom/client'
import { readFile, writeFile } from "fs/promises"
import path from "path"

// 客户端路由缓存
let clientJSXCache = {}
let currentPathname = window.location.pathname;
let updateRoot

const clientComponents = document.querySelectorAll("[data-client=true]")

// 遍历所有客户端组件占位，根据data-component，加载对应JS 文件，然后在客户端渲染水合
for (const clientComponent of clientComponents) {
  const componentName = clientComponent.getAttribute("data-component")
  const ClientComponent = await import("./client/" + `${componentName}.js`)
  const { jsx, props } = ClientComponent

  const clientComponentJSX = React.createElement(jsx, props)
  clientComponent.setAttribute("data-loading", false)

  const clientComponentRoot = createRoot(clientComponent)
  clientComponentRoot.render(clientComponentJSX)
}

function Shell({ data }) {
  console.log("Shell", data)
  const [root, setRoot] = useState(use(data))
  clientJSXCache[currentPathname] = root
  updateRoot = setRoot
  return root
}

let data = createFromFetch(
  fetch(currentPathname + '?jsx')
)

hydrateRoot(document, React.createElement(Shell, { data }))

async function navigate(pathname, revalidate = true) {
  currentPathname = pathname;

  // 不校验
  if (!revalidate && clientJSXCache[pathname]) {
    updateRoot(clientJSXCache[pathname])
    return
  } else {
    const response = fetch(pathname + '?jsx')
    const root = await createFromFetch(response)
    clientJSXCache[pathname] = root
    startTransition(() => {
      updateRoot(root)
    })
  }
}

window.addEventListener("click", (e) => {
  // 忽略非 <a> 标签点击事件
  if (e.target.tagName !== "A") {
    return;
  }
  // 忽略 "open in a new tab".
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
    return;
  }
  // 忽略外部链接
  const href = e.target.getAttribute("href");
  if (!href.startsWith("/")) {
    return;
  }
  // 组件浏览器重新加载页面
  e.preventDefault();
  // 但是 URL 还是要更新
  window.history.pushState(null, null, href);
  // 调用我们自己的导航逻辑
  navigate(href);
}, true);

window.addEventListener("popstate", () => {
  // 处理浏览器前进后退事件
  navigate(window.location.pathname);
});

// 阻止表单提交，以 POST 请求调用 `/actions/*`，用 navigate 函数重新渲染页面
window.addEventListener("submit", async (e) => {
  const action = e.target.action
  const actionURL = new URL(action, window.location.origin)

  if (!actionURL.pathname.startsWith("/actions/")) {
    return
  }

  e.preventDefault()

  if (e.target.method === "post") {
    const formData = new FormData(e.target)
    const body = Object.fromEntries(formData.entries())
    const response = await fetch(action, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) return
    navigate(window.location.pathname, false) // false则走缓存，不重新渲染整个页面
    return
  } else {
    console.error("unknown method", e.target.method)
  }
})

export async function renderJSXToClientJSX(jsx) {
  if (
    typeof jsx === "string" ||
    typeof jsx === "number" ||
    typeof jsx === "boolean" ||
    jsx == null
  ) {
    return jsx;
  } else if (Array.isArray(jsx)) {
    return Promise.all(jsx.map((child) => renderJSXToClientJSX(child)));
  } else if (jsx != null && typeof jsx === "object") {
    if (jsx.$$typeof === Symbol.for("react.element")) {
      if (typeof jsx.type === "string") {
        return {
          ...jsx,
          props: await renderJSXToClientJSX(jsx.props),
        };
      } else if (typeof jsx.type === "function") {
        const Component = jsx.type;
        const props = jsx.props;
        const isClientComponent = Component.toString().includes("use client")
        if (isClientComponent) {
          return await transformClientComponent(Component, props)
        } else {
          const returnedJsx = await Component(props)
          return renderJSXToClientJSX(returnedJsx)
        }
      } else throw new Error("Not implemented.");
    } else {
      return Object.fromEntries(
        await Promise.all(
          Object.entries(jsx).map(async ([propName, value]) => [
            propName,
            await renderJSXToClientJSX(value),
          ])
        )
      );
    }
  } else throw new Error("Not implemented");
}

async function transformClientComponent(Component, props) {

  const raw = Component.toString()
  const children = await renderJSXToClientJSX(props.children)

  const clientComponent = {
    value: raw,
    props: {
      ...props,
      "data-client": true,
      "data-component": Component.name,
      children,
    },
  }

  await createClientComponentJS(clientComponent)

  return React.createElement(
    "div",
    {
      "data-client": true,
      "data-component": Component.name
    }
  )
}

async function createClientComponentJS(Component) {
  const { props, value } = Component
  const name = props["data-component"]
  const filenameRaw = path.join(process.cwd(), "public", "client", name + ".js")
  const filename = path.normalize(filenameRaw)
  const fileContents = `import React from "react"
      export const props = ${JSON.stringify(props)}
      export const jsx = ${value.replaceAll('import_react.default', 'React')}`
  try {
    await writeFile(filename, fileContents)
  } catch (err) {
    console.log("error in writeComponentToDisk", err)
  }
}