# 期末补完计划 (Final Exam Completer)

> AI 驱动的期末复习桌面应用

[![Electron](https://img.shields.io/badge/Electron-28-blue.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 功能特性

### 核心功能
- **资料管理** - 支持 PDF、DOCX、Markdown 上传与解析，支持标签分类和收藏
- **AI 搜集** - 智能搜索互联网复习资料，多源聚合
- **AI 出题** - 基于资料生成 5 种题型（单选/多选/判断/简答/资料分析）
- **交互式答题** - 答题界面 + 按需查看解析
- **错题本** - 自动记录错题，支持重练和导出

### 增强功能
- **文档生成** - 自动生成结构化复习文档（Markdown/PDF）
- **知识图谱** - 概念关系可视化，交互式图谱
- **AI 答疑** - 基于资料库的对话式答疑
- **薄弱点分析** - 基于答题数据的分析报告
- **终端** - 内置终端支持 Claude Code/Mimo 等 CLI 工具
- **主题切换** - 6 种配色主题（深海蓝/森林绿/暖阳橙/暮光紫/玫瑰红/暗夜模式）
- **视频制作** - 将学习资料转化为视频脚本
- **漂亮文章** - 将学习资料转化为精美文章

## 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn

### 安装

```bash
# 克隆项目
git clone https://github.com/shizelengleng/final-exam-completer.git
cd final-exam-completer

# 安装依赖
npm install

# 启动开发模式
npm run dev
```

### 配置 AI

1. 启动应用后，点击右上角设置图标
2. 在「AI 配置」标签页选择 AI 模型（DeepSeek/MiMo/Claude Code）
3. 输入 API Key 并保存

### 打包

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron |
| 前端框架 | React + TypeScript |
| UI 组件 | Ant Design + Tailwind CSS |
| 本地存储 | SQLite |
| AI 模型 | DeepSeek / MiMo / Claude |
| 打包工具 | electron-builder |

## 项目结构

```
final-exam-completer/
├── electron/                # 主进程
│   ├── main.ts             # 入口文件
│   ├── preload.ts          # 预加载脚本
│   ├── db/                 # 数据库
│   ├── ipc/                # IPC 通信
│   ├── services/           # 服务层
│   └── terminal/           # 终端功能
├── src/                    # 渲染进程
│   ├── components/         # React 组件
│   ├── contexts/           # Context
│   ├── stores/             # 状态管理
│   └── styles/             # 样式
├── config/                 # 配置文件
└── package.json
```

## 使用说明

### 上传资料
1. 选择或创建一个学科
2. 点击「我的资料」标签
3. 拖拽或点击上传 PDF、DOCX、Markdown 文件

### AI 出题
1. 选择学科，点击「AI 出题」标签
2. 选择参考资料（可选）
3. 设置题型、难度、数量
4. 点击「开始 AI 出题」

### 知识图谱
1. 选择学科，点击「知识图谱」标签
2. 选择资料来源
3. 点击「生成知识图谱」

## 作者

**矢泽冷冷** - [GitHub](https://github.com/shizelengleng)

## 许可证

MIT License
