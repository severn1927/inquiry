# INQ V3 - 询盘管理系统

询盘邮件管理系统前端，基于 React + TypeScript + Vite + Tailwind CSS。

## 技术栈

- React 18 + TypeScript
- Vite 6
- Tailwind CSS 3
- React Router v7
- Zustand（状态管理）
- Recharts（图表）
- Axios（HTTP 请求）

## 本地开发

```bash
npm install
npm run dev
```

## 构建

```bash
# 开发环境（API 指向本地）
npm run build

# 生产环境（API 指向线上）
VITE_API_BASE_URL=https://api.css123.com npm run build
```

## 部署

部署到 Cloudflare Pages 时，在环境变量中设置：

| 变量名 | 值 |
|---|---|
| `VITE_API_BASE_URL` | `https://api.css123.com` |
