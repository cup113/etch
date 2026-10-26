import type { CapacitorConfig } from '@capacitor/cli';

// 原生壳（ADR-0003）：不是 TWA，不加载远端 URL。
// webDir 直接指向 adapter-static 的产物 `build/`，整个站点被塞进 APK 的 assets，
// 由 WebView 从 https://localhost 加载 —— 装完即用，飞行模式也能开新碑。
const config: CapacitorConfig = {
	appId: 'io.github.cup113.etch',
	appName: 'Etch',
	webDir: 'build'
};

export default config;
