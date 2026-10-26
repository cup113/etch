# ADR-0003: APK 用 Capacitor 打包静态产物，签名密钥只存在于 CI 的秘密与你的密码管理器里

"再造一个能装的应用"有两条路：**TWA**（PWABuilder / Bubblewrap 那套，APK 只是一层 Chrome 壳，启动时去加载远端 URL）与**自带资源的 WebView 壳**。我们选后者（Capacitor）：`webDir` 指向 adapter-static 的 `build/`，整站被复制进 APK 的 assets，由 WebView 从 `https://localhost` 加载。TWA 要求一个已部署的 HTTPS 域名、`/.well-known/assetlinks.json` 里钉上签名证书的 SHA-256、且**首次启动必须联网**——最后一条与 ADR-0002 的离线承诺直接冲突。发行包只由 CI 产出：签名密钥不入库，口令不落盘，只从环境变量读。

## Considered Options

- **TWA**：零 WebView 维护成本，但需要域名 + assetlinks + 首启联网，换密钥要同时改线上文件；对一个"装完就能在地下室开新碑"的应用是三个不必要条件。
- **PWABuilder 的 Android 包**：同样是 TWA 的封装，问题相同。
- **debug 签名分发**：`~/.android/debug.keystore` 口令公开（`android` / `androiddebugkey`），任何人都能签出"更新"覆盖已装应用，不能作为发行身份。
- **Play App Signing**：Google 保管 app signing key、开发者只持 upload key，能从根上缓解密钥丢失；但需要 Play Console 与一条上架流程，侧载自用是多余的。等真要上架再引入，届时上传 AAB 而非 APK。

## Consequences

- **丢密钥的代价在这里被放大**：换新 key 意味着换包名，用户必须卸载旧应用才能装——而卸载会清空 IndexedDB。也就是说密钥丢失不只是发版事故，等于**用户账本丢失**，唯一退路是事先导出的拓片。因此 `.jks` 与口令必须进密码管理器并另存离线备份，"升级前先导出拓片"是文档层面必须显眼的事。
- 密钥缺位时 `assembleRelease` **响亮失败**（`android/app/build.gradle` 里的 `taskGraph.whenReady` 守卫），绝不静默退化成未签名包：一个"能装"但没签对的包一旦被当成发行版发出去，更新签名权就等于交给了所有人。
- `versionCode` 取 `github.run_number`（单调递增，系统拒绝 versionCode 不增的覆盖安装），`versionName` 取 tag 或 `0.0.0-dev.<run>`。副作用：**重跑同一次 workflow 会复用同一个 `run_number`**，于是重跑产出的包与原来同 versionCode —— 用来救一次偶发失败没问题，但它不能作为"更新"覆盖同版本安装，因为系统不认为有更新。要覆盖，就再打一个 tag。
- 仓库变量 `ANDROID_CERT_SHA256`（证书指纹是公开信息，不需要保密）用于在 CI 里断言"这次签出来的确实是那把 key"。签错的包照样能装，只是永远覆盖不了已装版本，作者常在发版当天才发现。首次发版时它还不存在（指纹只有签过一次才知道），`Verify signature` 会在缺失时给出 warning 而不是失败——拿到指纹后把它设成仓库变量，此后每次构建都会硬校验。
- `android/` 是 `cap add android` 的模板产物，**进仓库**（可复核、无需每次生成），但 `app/src/main/assets/public` 是 `cap sync` 复制的构建产物，已忽略——所以 CI 必须先 `pnpm build` 再 `cap sync`。
- 图标与启动图由 `scripts/android-assets.py` 从 `src/lib/assets/favicon.svg` 的几何生成（4× 超采样后降采样）；`cap add` 默认给的是 Capacitor 自己的 logo，`@capacitor/android` 还把 `colorPrimary` 定成 indigo，均在应用级资源里覆盖。
- `navigator.vibrate` 在 Android WebView 里需要 `android.permission.VIBRATE`；缺了不报错，只是**静默无声**——触感是"刻"的手感的一半，所以这条权限是功能而非装饰。
- 保持 `minifyEnabled false`：Capacitor 的桥靠反射找插件类，混淆规则要自己维护，省下的几 MB 不值得引入一类只在真机上复现的崩溃。
- `allowBackup` 保持 `true`：这是系统级备份，可能把 WebView 的 IndexedDB 带进用户的 Google 账号。它与 ADR-0002 的"无同步"存在张力，但方向一致——"刻下的不消失"也包括"重装后还在"。若将来判定它违反单设备承诺，改成 `false` 即可，代价是重装即清空。
- WebView 里 service worker 仍会注册（`https://localhost` 是安全上下文）。无害：导航 network-first、构建产物按内容哈希命名，本地服务端本身就是最新的；但这也意味着**离线能力的 PWA 断言不能替代 APK 的可用性验证**。
- 签名作业只由 `workflow_dispatch` 与 `v*` tag 触发：fork 来的 PR 拿不到 secret（GitHub 的设计），也没有理由让外部 PR 消耗一次签名。
