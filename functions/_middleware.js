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

  return context.next();
}
