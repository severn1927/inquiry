# INQ V3 - 询盘管理系统

客户询盘邮件管理系统 V3 版本前端。

## 技术栈

- React 18 + TypeScript
- Vite
- Tailwind CSS 3
- Zustand (状态管理)
- Axios (HTTP 请求)
- Recharts (图表)
- Lucide React (图标)
- react-hot-toast (通知)
- xlsx + file-saver (Excel 导出)

## 功能

- **仪表盘** — 询盘数据概览与趋势分析
- **询盘列表** — 搜索、筛选、分页、导出 Excel
- **新增询盘** — 截图/文字输入，DeepSeek AI 自动提取客户信息并分配业务员
- **询盘详情** — 完整信息展示与编辑
- **询盘分析** — AI 智能分析邮件内容，判断是否为有效询盘
- **用户管理** — 业务员信息管理（仅管理员）
- **系统设置** — API 配置、业务员权重、亚太区排班表（仅管理员）

## 业务员分配规则

| 大区 | 分配方式 |
|------|----------|
| 亚太 | 排班轮换（按排班表顺序） |
| 美洲 | 权重随机 |
| 欧非 | 权重随机 |

## 快速开始

```bash
npm install
npm run dev
```

默认运行在 `http://localhost:3000`，API 代理到 `http://localhost:8001`。

## 环境要求

- Node.js >= 18
- 后端服务运行在 8001 端口（FastAPI）
