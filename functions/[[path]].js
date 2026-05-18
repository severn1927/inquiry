export async function onRequest(context) {
  const url = new URL(context.request.url);

  // /api 请求 -> 代理到后端
  if (url.pathname.startsWith('/api/')) {
    const backendUrl = 'https://api.css123.com' + url.pathname + url.search;
    const headers = new Headers(context.request.headers);
    headers.delete('host');
    return fetch(backendUrl, {
      method: context.request.method,
      headers: headers,
      body: context.request.body,
    });
  }

  // 静态资源（含 . 的路径）让 Cloudflare 自动处理
  if (url.pathname.startsWith('/assets/') || url.pathname.includes('.')) {
    return context.next();
  }

  // 其他请求 -> SPA fallback
  return context.env.ASSETS.fetch('/index.html');
}
