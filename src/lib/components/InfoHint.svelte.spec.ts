import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import InfoHint from './InfoHint.svelte';

describe('InfoHint', () => {
	it('说明浮在页面上：fixed 定位，图标位置不变（不推挤文档流）', async () => {
		render(InfoHint, { label: '玩法', text: '第一行\n第二行', testid: 't' });
		const button = page.getByTestId('info-t');
		const before = (await button.element()).getBoundingClientRect();

		await button.click();

		const panel = await page.getByTestId('info-panel-t').element();
		expect(getComputedStyle(panel).position).toBe('fixed');
		await expect.element(page.getByTestId('info-panel-t')).toHaveTextContent('第二行');

		// 关键：面板进的是浮层而不是行内 —— 图标本身的位置一点没动
		const after = (await button.element()).getBoundingClientRect();
		expect(after.top).toBe(before.top);
		expect(after.left).toBe(before.left);

		// 落位被夹在视口内（不靠右侧/底部滚出屏幕）
		const box = panel.getBoundingClientRect();
		expect(box.left).toBeGreaterThanOrEqual(0);
		expect(box.right).toBeLessThanOrEqual(window.innerWidth);
	});

	it('点面板外（或按 Esc）即收起', async () => {
		render(InfoHint, { label: '甲', text: '甲说明', testid: 'a' });

		await page.getByTestId('info-a').click();
		const panel = page.getByTestId('info-panel-a');
		await expect.element(panel).toBeVisible();

		// 面板是浮层（会盖住下面的行），所以用真实事件打页面空白处，而不是找个按钮去点
		document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
		await expect.poll(() => panel.query()).toBeNull();

		// Esc 同样收起
		await page.getByTestId('info-a').click();
		await expect.element(panel).toBeVisible();
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		await expect.poll(() => panel.query()).toBeNull();
	});

	it('表格型说明按行列渲染（换算、对照用表）', async () => {
		render(InfoHint, {
			label: '同伴名次与进级',
			testid: 'g',
			table: {
				head: ['头游同伴', '进级'],
				rows: [
					['二游（双下）', '+3'],
					['末游', '+1']
				],
				note: '级牌 2 → A'
			}
		});

		await page.getByTestId('info-g').click();

		const panel = page.getByTestId('info-panel-g');
		await expect.element(panel).toBeVisible();
		await expect.element(panel).toHaveTextContent('头游同伴');
		await expect.element(panel).toHaveTextContent('二游（双下）');
		await expect.element(panel).toHaveTextContent('+3');
		await expect.element(panel).toHaveTextContent('级牌 2 → A');
	});
});
