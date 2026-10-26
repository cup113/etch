# Changelog

本项目的重要变更都记在这里。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)。

## [0.1.0] - 2026-10-26

首个可安装版本。

### Added

- **追加式刻痕账本**：每一笔不可改、不可删；改错只能**凿除**（冲正一笔，原笔划掉、不再计分、但永远留在碑上），当前分永远由全部未凿笔折叠得出
- **四个模板**：通用、斗地主、UNO（计分 / 出局两种变体）、掼蛋——三种不同的规则形状，各自可配变体
- **碑不执法**：终局条件满足只宣告，从不锁死刻入
- **单设备离线**：数据在本机 IndexedDB，无后端无账号；PWA 可装主屏、断网可开；跨设备靠**拓片**（版本化 JSON 导出/导入，导入时重放校验）
- **中英双语**、单色高对比界面、落笔"刻进去"的动效与轻微触感
- **玩家花名册**：combobox 复用已有花名，也允许显式新增，不做头像
- **Android APK**：Capacitor 壳把静态产物打进 APK，装完断网即用（[ADR-0003](docs/adr/0003-apk-packaging-and-key-custody.md)）
- **发布流水线**：打 `v*` tag 产出签名 APK、构建来源证明与 GitHub Release，并用证书指纹断言签名身份

### Fixed

- service worker 的导航策略改为 network-first：曾经让它走 cache-first，结果新部署永远进不来、旧页面继续请求已被删除的哈希 chunk，整站在线状态都打不开
- IndexedDB 拒绝克隆 Svelte 的响应式 Proxy（`DataCloneError`）：落盘前 `$state.snapshot`，且先写盘再让 UI 可见
- UNO 出局制下赢家的剩牌输入是禁用的，却仍被校验为必填：跳过赢家记 0
- 自适应图标的前景是近白横杠，而模板底色是纯白——在 API 26+ 上等于没有图标
- `navigator.vibrate` 在 Android WebView 里缺 `VIBRATE` 权限是静默无声的，补上

[0.1.0]: https://github.com/cup113/etch/releases/tag/v0.1.0
