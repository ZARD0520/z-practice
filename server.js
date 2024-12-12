import express from 'express'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { readdirSync } from "fs"
import { join } from "path"

const app = express()
app.use(express.static('public'))

// 获取页面路径组
const pagesDir = join(process.cwd(), "/pages")
const pages = readdirSync(pagesDir).map(page => page.split(".")[0])

app.get(/.*$/, async (req, res) => {

  // 获取请求路由路径，如无则用默认index
  const path = req.path.split('/')[1]
  const page = path ? path : 'index'

  // 页面路径组是否包含请求的路径，是就正常处理和返回
  if (pages.includes(page)) {
    // 导入页面文件，获取getServerSideProps方法
    const file = await import(`./pages/index.js`)
    let propsObj = {}
    if (file.getServerSideProps) {
      const { props } = await file.getServerSideProps({ query: req.query })
      propsObj = props
    }
    // 拿到页面文件的组件，传入请求后的数据
    const Component = file.default
    const content = renderToString(<Component {...propsObj} />)

    res.send(`
    <html>
      <head>
          <title>Tiny React SSR</title>
      </head>
      <body>
        <div id='root'>${content}</div>
        <script>
          window.__DATA__ = ${JSON.stringify({
            props: propsObj,
            page
          })}  // 为防止水合出错，除请求的数据渲染到服务端，还要传给客户端进行渲染
        </script>
        <script src="/client.bundle.js"></script>
      </body>
    </html>
    `)
  } else {
    return res.status(200).json({ message: `${page} not found in ${pages}` })
  }
})

app.listen(3000, () => console.log('listening on port 3000!'))