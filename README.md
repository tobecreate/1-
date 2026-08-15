# 大布象棋

一款离线可玩的中国象棋应用：内置 Pikafish 强引擎，古风马卡龙界面，支持人机对弈、自我对弈、复盘、棋谱存取与实时胜率分析。桌面端（Windows）与手机端（PWA）双形态。

> 开发者：哥伦布

## 下载与使用

**Windows 桌面版**

- **安装包（推荐）**：前往 [Releases 页面](https://github.com/tobecreate/1-/releases) 下载 `大布象棋_1.0.0_x64-setup.exe`，双击安装后开始菜单与桌面出现「大布象棋」快捷方式，自带卸载器。
- **便携版（免安装）**：前往 [Releases 页面](https://github.com/tobecreate/1-/releases) 下载 `大布象棋-便携版.zip`，解压后双击「大布象棋.exe」即玩，可拷到任意位置。

> 运行需系统装有 WebView2 运行时（Windows 10/11 自带）；旧系统可在安装时按提示下载。

**网页版（PWA）**

- 本地运行 `npm run sync:web` 生成 `deploy/` 后，部署到任意 HTTPS 静态托管，即可在手机/电脑浏览器直接安装使用。

**从源码本地构建桌面版**

- 双击根目录 `build-desktop.bat`，自动生成 `dist\` 下的安装包与便携版（构建工具链已随项目内置，无需系统级安装）。

## 构建方法

- **桌面端重新出包**：改完 `index.html` 后双击根目录 `build-desktop.bat`，自动完成
  `npm run sync:web` → `cargo build`（Tauri 壳）→ makensis（NSIS 安装包）→ 便携版打包 →（可选）代码签名。
- **PWA 部署**：`npm run sync:web` 生成 `web-dist/`（Tauri 前端）与 `deploy/`（PWA 外置引擎版，体积小、首屏快）；把 `deploy/` 放到任意 HTTPS 静态托管即可安装使用。
- **代码签名（可选）**：设置环境变量 `SIGN_PFX`（PFX 证书路径）与 `SIGN_PASSWORD` 后运行 `build-desktop.bat`，产物将被 signtool 签名（消除 SmartScreen 提示）。

## 目录结构

```
【已入库】
index.html            独立版游戏（内嵌引擎，双击 file:// 可玩）
engine/  worker/       Pikafish 引擎文件（js/wasm/data + 工作线程）
engineAdapter.js       引擎适配层（内嵌/外置双路径）
src-tauri/            Tauri v2 桌面壳（Rust）
tools/                构建脚本（sync-web-dist / build-desktop / sign / install.nsi）
build-desktop.bat     桌面端一键构建入口

【本地构建产物，未入库（由构建脚本生成）】
web-dist/             Tauri 前端（npm run sync:web 生成）
deploy/               PWA 部署目录（外置引擎版，npm run sync:web 生成）
dist/                 交付产物（安装包 + 便携版，build-desktop.bat 生成）
```

## 环境说明

- 构建依赖项目内置的便携 Node（`node-portable/`）与 Rust 工具链（`.rustup/.cargo/.mingw`），无需系统级安装。
- NSIS 编译器位于 `.nsis/`（makensis）。
