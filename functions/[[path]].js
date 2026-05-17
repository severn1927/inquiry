export function onRequestGet(context) {
  const url = new URL(context.request.url);
  // 如果是静态资源请求，让 Cloudflare 自动处理
  if (url.pathname.startsWith('/assets/') || url.pathname.includes('.')) {
    return context.next();
  }
  // 其他请求返回 index.html（SPA fallback）
  return context.env.ASSETS.fetch('/index.html');
}
