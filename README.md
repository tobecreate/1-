# 大布象棋

一款离线可玩的中国象棋应用：内置 Pikafish 强引擎，古风马卡龙界面，支持人机对弈、自我对弈、复盘、棋谱存取与实时胜率分析。桌面端（Windows）与手机端（PWA）双形态。

> 开发者：哥伦布

## 三种入口

1. **安装包（商用形态）**：`dist\大布象棋-安装包\大布象棋_1.0.0_x64-setup.exe`
   双击安装后，开始菜单与桌面出现「大布象棋」快捷方式，带卸载器。
2. **便携版（免安装）**：`dist\大布象棋-便携版\大布象棋.exe`
   整个文件夹可拷到任意位置双击即玩；另附 `开始游戏.bat`。
3. **根目录一键启动**：`启动大布象棋.bat`（指向便携版 exe）。

> 运行需系统装有 WebView2 运行时（Windows 10/11 自带）；旧系统可在安装时按提示下载。

## 构建方法

- **桌面端重新出包**：改完 `index.html` 后双击根目录 `build-desktop.bat`，自动完成
  `npm run sync:web` → `cargo build`（Tauri 壳）→ makensis（NSIS 安装包）→ 便携版打包 →（可选）代码签名。
- **PWA 部署**：`npm run sync:web` 生成 `web-dist/`（Tauri 前端）与 `deploy/`（PWA 外置引擎版，体积小、首屏快）；把 `deploy/` 放到任意 HTTPS 静态托管即可安装使用。
- **代码签名（可选）**：设置环境变量 `SIGN_PFX`（PFX 证书路径）与 `SIGN_PASSWORD` 后运行 `build-desktop.bat`，产物将被 signtool 签名（消除 SmartScreen 提示）。

## 目录结构

```
index.html            独立版游戏（内嵌引擎，双击 file:// 可玩）
engine/  worker/       Pikafish 引擎文件（js/wasm/data + 工作线程）
engineAdapter.js       引擎适配层（内嵌/外置双路径）
web-dist/             Tauri 前端（构建产物，由 sync:web 生成）
deploy/               PWA 部署目录（外置引擎版，由 sync:web 生成）
dist/                 交付产物（安装包 + 便携版）
src-tauri/            Tauri v2 桌面壳（Rust）
tools/                构建脚本（sync-web-dist / build-desktop / sign / install.nsi）
build-desktop.bat     桌面端一键构建入口
```

## 环境说明

- 构建依赖项目内置的便携 Node（`node-portable/`）与 Rust 工具链（`.rustup/.cargo/.mingw`），无需系统级安装。
- NSIS 编译器位于 `.nsis/`（makensis）。
