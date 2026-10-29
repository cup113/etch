import { defineConfig } from '@playwright/test';

export default defineConfig({
	// 4173 常被本机别的预览/开发服务占用；e2e 用独立端口，且不复用已有服务，避免测到别人的页面。
	webServer: {
		command: 'npm run build && npm run preview -- --port 4174',
		port: 4174,
		reuseExistingServer: false
	},
	testMatch: '**/*.e2e.{ts,js}',
	// e2e 断言中文文案：默认浏览器语言是 en-US，会让 i18n 落到英文
	use: { locale: 'zh-CN' }
});
