import escapeHtml from 'escape-html'

export async function renderJSXToHTML(jsx) {
  if (typeof jsx === "string" || typeof jsx === "number") {
    return escapeHtml(String(jsx));
  } else if (jsx == null || typeof jsx === "boolean") {
    return "";
  } else if (Array.isArray(jsx)) {
    const childHtmls = await Promise.all(jsx.map((child) => renderJSXToHTML(child)).join(""))
    return childHtmls.join("")
  } else if (typeof jsx === "object") {
    if (jsx.$$typeof === Symbol.for("react.element")) {
      let html = "<" + jsx.type;
      for (const propName in jsx.props) {
        if (jsx.props.hasOwnProperty(propName) && propName !== "children") {
          html += " ";
          html += propName;
          html += "=";
          html += `"${escapeHtml(jsx.props[propName])}"`;
        }
      }
      html += ">";
      html += await renderJSXToHTML(jsx.props.children);
      html += "</" + jsx.type + ">";
      html = html.replace(/className/g, "class")
      return html;
    } else if (typeof jsx.type === "function") {
      // 组件类型如 <BlogPostPage> 
      const Component = jsx.type;
      const props = jsx.props;
      const returnedJsx = await Component(props);
      return renderJSXToHTML(returnedJsx); 
    } else throw new Error("Cannot render an object.");
  } else throw new Error("Not implemented.")
}