# Flight Simulator @ Cesium

一个基于 Web 的飞行模拟器，使用 **React + Vite + Cesium.js** 构建。体验交互式飞行控制、仪表盘、全球航点导航与音效。

---

## ✨ 主要功能

### ✈️ 飞行模拟核心
- 物理引擎：简化的实时飞行物理（俯仰 / 滚转 / 偏航 / 油门 / 速度）
- 多机型切换：如通用飞机、F-22 战斗机（性能差异）
- 地形碰撞检测：支持全球高精度地形
- 飞行状态警告：失速、超音速（音爆）、坠毁

### 🌍 3D 世界与可视化
- Cesium.js 高精度 3D 地球
- 全球地形：Cesium World Terrain
- 高清卫星影像：Google Satellite 图层
- 3D 建筑：OpenStreetMap 建筑模型

### 🎮 用户界面与交互
- 仪表盘组件：
  - 姿态指示器 (Attitude Indicator)
  - 雷达 / 小地图 (Radar Map)
  - HUD 飞行参数：速度、经纬度、高度、航向等
- 动态追随相机：自动回归、支持拖拽与缩放
- 全球 / 飞行双模式视图：支持双击地球快速重定位飞机

### 📍 航点导航系统
- 航点管理面板：地标选择 / 手动输入 / 地图点击添加
- 高度设置：支持 AGL（距地高度）
- HUD 导航信息：距离、方位、高度差、ETA
- 自动航点切换：到达后进入下一个

### 🔊 音频系统
- 引擎动态音效：音量与音高随油门和速度变化
- 状态音效：失速警告 / 音爆 / 坠机

### 🚀 用户体验
- 资源加载界面
- 欢迎与指引面板

---

## 🛠️ 技术栈

| 类别 | 技术 |
| ---- | ---- |
| 前端框架 | React |
| 构建工具 | Vite |
| 3D 引擎 | Cesium.js |
| 集成插件 | vite-plugin-cesium |

---

### 配置环境变量
项目需要一个 Cesium Ion Access Token：
1. 注册 Cesium Ion 账户
2. 创建 Access Token
3. 在项目根目录新建 `.env`
4. 写入：
```env
VITE_CESIUM_ION_TOKEN="你的 Cesium Ion Access Token"
```

### 启动开发服务器
下载项目文件到本地后运行：
```bash
npm install
npm run dev
```
浏览器访问：`http://localhost:5173`

---

## 🕹️ 使用说明

### 键盘控制
| 按键 | 功能 |
| ---- | ---- |
| W / S | 俯冲 / 抬升 (Pitch) |
| A / D | 左滚 / 右滚 (Roll) |
| Q / E | 左转 / 右转 (Yaw) |
| Shift | 增加油门 |
| Ctrl | 减少油门 |

### 鼠标
- 左键拖拽：旋转相机
- 滚轮：缩放视距

### 界面交互
- 开始飞行：欢迎界面按钮
- 选择飞机：右上角面板
- 切换视图：底部 “全球视图 / 返回飞行”
- 航点管理：右下角面板 → 添加 → 开始导航

---

## 📁 项目结构
```
.
├── public/
│   └── assets/              # 模型 (.glb) 与音频 (.wav)
├── src/
│   ├── components/          # UI 组件
│   ├── config/              # 静态配置 (飞机 / 地标)
│   ├── helpers/             # 核心模拟逻辑
│   ├── App.jsx
│   └── main.jsx
├── .env
├── eslint.config.js
├── vite.config.js
└── README.md
```

---

## 📌 配置说明
- `aircraftConfig.js`：飞机参数、模型路径
- `landmarksConfig.js`：全球地标坐标（可用于航点快速添加）

---

## ⚠️ 注意事项
- 流畅度取决于网络与设备性能（地形与影像实时加载）
- 若地形或影像缺失：检查网络与 Cesium Ion Token
- 首次交互后才会解锁音频

---