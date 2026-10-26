# Etch

**网页计分器 —— 刻上去，就不消失。**
_Etch — Scores that never vanish._

纸会破，内存会丢，但刻在石头上的东西不会。Etch 是牌桌上传递一部手机用的计分器：每一笔记分是一次**刻**，落笔即永恒——不可改、不可删，改错只能**凿除**（冲正笔划掉显示、不再计分、永远留痕）。

## 特性

- **追加式刻痕账本**（[ADR-0001](docs/adr/0001-append-only-entry-ledger.md)）：当前分永远由全部未凿笔**折叠**得出，完整历史审计免费
- **单设备离线**（[ADR-0002](docs/adr/0002-local-first-single-device-no-sync.md)）：数据在本机 IndexedDB，无后端无账号；PWA 可装主屏、断网可开；跨设备靠**拓片**（版本化 JSON 导出/导入）
- **四个模板**：通用（任意整数）、斗地主（底分×倍数）、UNO（计分制/出局制两种变体，阈值可调）、掼蛋（两队爬级过 A，双下跳级）
- **碑不执法**：终局条件满足只**宣告**，从不锁死刻入
- **玩家花名册**：combobox 联想 + 显式新建，常客越用越顺手；无头像无档案
- **中英双语**：跟随浏览器语言，可手动切换
- 单色高对比 UI，落笔"刻进去"动效，支持处轻微触感反馈（`navigator.vibrate`）

领域术语（碑、笔、凿除、折叠、拓片……）见 [CONTEXT.md](CONTEXT.md)。

## 开发

```sh
pnpm install
pnpm run dev          # 开发服务器
pnpm run check        # svelte-check 类型检查
pnpm run lint         # prettier + eslint
pnpm run test         # 单元 + 组件 + e2e（首次会自动下载 Playwright 浏览器）
pnpm run build        # 纯静态产物（adapter-static SPA fallback）
```

栈：SvelteKit 3（SPA 模式）· Svelte 5 runes · Tailwind CSS 4 · Vitest 4（browser mode）· Playwright · TypeScript。
