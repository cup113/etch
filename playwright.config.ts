import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: { command: 'npm run build && npm run preview', port: 4173 },
	testMatch: '**/*.e2e.{ts,js}',
	// e2e 断言中文文案：默认浏览器语言是 en-US，会让 i18n 落到英文
	use: { locale: 'zh-CN' }
});
