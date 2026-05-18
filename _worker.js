export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // /api 请求 -> 代理到后端
    if (url.pathname.startsWith('/api/')) {
      const backendUrl = 'http://api.css123.com' + url.pathname + url.search;
      const headers = new Headers(request.headers);
      headers.delete('host');
      return fetch(backendUrl, {
        method: request.method,
        headers: headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      });
    }

    // 静态资源
    if (url.pathname.startsWith('/assets/') || url.pathname.includes('.')) {
      return env.ASSETS.fetch(request);
    }

    // SPA 回退
    return env.ASSETS.fetch('/index.html');
  }
};
