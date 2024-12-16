import express from 'express';
import { htmlGenerator } from "./generator"
import { readFile } from 'fs/promises';
import escapeHtml from 'escape-html'

const app: any = express()

// 渲染字符串形式，还需要进行安全转义
// async function htmlGenerator() {
//   const author = "YaYu"
//   const postContent = await readFile("./posts/hello.txt", "utf8")

//   return `<html>
//     <head>
//       <title>My blog</title>
//       <script src="https://cdn.tailwindcss.com"></script>
//     </head>
//     <body class="p-5">
//       <nav class="flex items-center justify-center gap-10 text-blue-600">
//         <a href="/">Home</a>
//       </nav>
//       <article class="h-40 mt-5 flex-1 rounded-xl bg-indigo-500 text-white flex items-center justify-center">
//         ${escapeHtml(postContent)}
//       </article>
//       <footer class="h-20 mt-5 flex-1 rounded-xl bg-cyan-500 text-white flex items-center justify-center">
//         (c) ${escapeHtml(author)}, ${new Date().getFullYear()}
//       </footer>
//     </body>
//   </html>`
// }

app.get('/:route(*)', async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const html = await htmlGenerator(url);
  res.setHeader("Content-Type", "text/html");
  res.end(html);
})

app.listen(3000, (err) => {
  if (err) return console.error(err);
  return console.log(`Server is listening on 3000`);
})