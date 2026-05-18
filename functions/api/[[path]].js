// /api 代理到后端 - 处理所有 HTTP 方法（GET/POST/PUT/DELETE）
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const backendUrl = 'http://api.css123.com' + url.pathname + url.search;
  const headers = new Headers(context.request.headers);
  headers.delete('host');
  return fetch(backendUrl, {
    method: context.request.method,
    headers: headers,
    body: context.request.method !== 'GET' && context.request.method !== 'HEAD' ? request.body : undefined,
  });
}
