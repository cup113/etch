import { expect, test } from '@playwright/test';

// e2e 针对构建产物（webServer: build + preview）：开碑 → 刻 → 持久 → 凿 → 拓片 → 语言 → 断网。

test('斗地主全流程：开碑、刻一局、刷新持久、凿除冲正、磨碑', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByTestId('brand')).toBeVisible();

	// 开碑：3 名玩家（combobox 显式新建，名字顺手入册）
	await page.getByTestId('tpl-card-doudizhu').click();
	const combo = page.getByTestId('player-combobox').locator('input');
	for (const name of ['老张', '李四', '王五']) {
		await combo.fill(name);
		await combo.press('Enter');
	}
	await page.getByTestId('start-tablet').click();
	await expect(page.getByTestId('board-title')).toBeVisible();

	// 刻一局：地主老张胜，底分 20 × 倍数 4 → +160 / -80 / -80
	await page.getByTestId('etch-panel').getByRole('button', { name: '老张' }).click();
	await page.getByTestId('base').fill('20');
	await page.getByTestId('multiplier').fill('4');
	await page.getByTestId('etch-submit').click();
	await expect(page.getByTestId('totals')).toContainText('160');
	await expect(page.getByTestId('totals')).toContainText('-80');

	// 刷新：碑还在（IndexedDB 持久，ADR-0002）
	await page.reload();
	await expect(page.getByTestId('totals')).toContainText('160');

	// 凿除这一局：划掉、不计分、留痕
	await page.getByTestId('entries').getByText('+160 老张').click();
	await page.getByRole('button', { name: '凿除' }).first().click(); // 展开确认
	await page.getByRole('button', { name: '凿除' }).first().click(); // 确认凿除
	await expect(page.getByTestId('totals')).toContainText('0');
	await expect(page.getByTestId('entries').getByText('已凿除')).toBeVisible();

	// 磨碑：两步确认后回首页，碑林清空
	await page.getByTestId('tablet-menu').click();
	await page.getByTestId('erase-ask').click();
	await page.getByTestId('erase-confirm-yes').click();
	await expect(page.getByTestId('brand')).toBeVisible();
	await expect(page.getByTestId('history-empty')).toBeVisible();
});

test('碑名：开碑可名、碑面可改、刷新后仍在、碑林显示', async ({ page }) => {
	await page.goto('/');
	await page.getByTestId('tpl-card-generic').click();
	await page.getByTestId('tablet-name').fill('周五晚');
	const combo = page.getByTestId('player-combobox').locator('input');
	for (const name of ['老张', '李四']) {
		await combo.fill(name);
		await combo.press('Enter');
	}
	await page.getByTestId('start-tablet').click();

	// 碑面标题 = 碑名，模板名退到副行
	await expect(page.getByTestId('board-title')).toContainText('周五晚');
	await expect(page.getByTestId('board-template')).toContainText('通用');

	// 碑务 → 改名
	await page.getByTestId('tablet-menu').click();
	await page.getByTestId('rename-ask').click();
	await page.getByTestId('rename-input').fill('周六午');
	await page.getByTestId('rename-confirm').click();
	await expect(page.getByTestId('board-title')).toContainText('周六午');

	// 刷新后仍在（碑名随碑落盘）
	await page.reload();
	await expect(page.getByTestId('board-title')).toContainText('周六午');

	// 碑林卡片：标题是碑名，副行带模板名
	await page.goto('/');
	const card = page.locator('[data-testid^="game-card-"]').first();
	await expect(card).toContainText('周六午');
	await expect(card).toContainText('通用');
});

test('UNO 出局制变体：宣告出局，且不锁刻入（碑不执法）', async ({ page }) => {
	await page.goto('/');
	await page.getByTestId('tpl-card-uno').click();
	await page.getByTestId('uno-elimination').click();
	await expect(page.getByTestId('uno-threshold')).toHaveValue('300');
	const combo = page.getByTestId('player-combobox').locator('input');
	for (const name of ['甲', '乙']) {
		await combo.fill(name);
		await combo.press('Enter');
	}
	await page.getByTestId('start-tablet').click();
	await expect(page.getByTestId('board-title')).toBeVisible();

	// 一局：甲出完，乙吃 320 分 → 乙触线宣告出局、甲最后站立
	await page.getByTestId('etch-panel').getByRole('button', { name: '甲' }).click();
	const remB = page.getByTestId('etch-panel').locator('label', { hasText: '乙' }).locator('input');
	await remB.fill('320');
	await page.getByTestId('etch-submit').click();

	await expect(page.getByTestId('proclamations')).toBeVisible();
	await expect(page.getByText('乙 出局（300 分）')).toBeVisible();
	await expect(page.getByText('只剩 甲 未触线')).toBeVisible();

	// 碑不执法：宣告后仍可继续刻
	await remB.fill('10');
	await page.getByTestId('etch-submit').click();
	await expect(page.getByTestId('entries')).toContainText('+10');
});

test('拓片往返：导出 → 磨碑 → 导入 → 总分一致', async ({ page }) => {
	await page.goto('/');
	await page.getByTestId('tpl-card-generic').click();
	const combo = page.getByTestId('player-combobox').locator('input');
	for (const name of ['老张', '李四']) {
		await combo.fill(name);
		await combo.press('Enter');
	}
	await page.getByTestId('start-tablet').click();

	// 通用碑刻一笔：+100 / -100
	const inputs = page.getByTestId('etch-panel').locator('input[type="number"]');
	await inputs.first().fill('100');
	await inputs.nth(1).fill('-100');
	await page.getByTestId('etch-submit').click();
	await expect(page.getByTestId('totals')).toContainText('100');

	// 导出拓片
	await page.getByTestId('tablet-menu').click();
	const [download] = await Promise.all([
		page.waitForEvent('download'),
		page.getByTestId('export-rubbing').click()
	]);
	const rubbingPath = test.info().outputPath('rubbing.json');
	await download.saveAs(rubbingPath);

	// 磨掉这块碑，再从拓片恢复
	await page.getByTestId('erase-ask').click();
	await page.getByTestId('erase-confirm-yes').click();
	await expect(page.getByTestId('history-empty')).toBeVisible();

	await page.getByTestId('import-rubbing').locator('input').setInputFiles(rubbingPath);
	await expect(page.getByTestId('import-ok')).toBeVisible();
	await expect(page.getByTestId('history-empty')).toBeHidden();

	// 打开恢复的碑：总分回来了
	await page.locator('[data-testid^="game-card-"]').first().click();
	await expect(page.getByTestId('totals')).toContainText('100');
	await expect(page.getByTestId('totals')).toContainText('-100');
});

test('语言切换：中英双语即时生效', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByText('刻上去，就不消失。')).toBeVisible();
	await page.getByTestId('open-settings').click();
	await page.getByTestId('lang-en').click();
	await expect(page.getByText('Scores that never vanish.')).toBeVisible();
	await page.getByTestId('settings-close').click();
});

test('双升：首庄可先选，刻完显示下一局庄家，刷新仍在，凿除回滚', async ({ page }) => {
	await page.goto('/');
	await page.getByTestId('tpl-card-shuangsheng').click();
	// 默认变体：80 分升级数 0、不封顶、无大光奖励、无倒级、轮庄
	const combo = page.getByTestId('player-combobox').locator('input');
	for (const name of ['甲', '乙', '丙', '丁']) {
		await combo.fill(name);
		await combo.press('Enter');
	}
	// 首庄先选甲（第一局）
	await page.getByTestId('first-declarer-seat-0').click();
	await page.getByTestId('start-tablet').click();
	await expect(page.getByTestId('board-title')).toBeVisible();

	// 首笔：闲家 40 分 → 庄家队（甲·丙）各 +1 级；下一局轮对家丙
	await page.getByTestId('defenders-score').fill('40');
	await page.getByTestId('etch-submit').click();
	await expect(page.getByTestId('totals')).toContainText('3');
	await expect(page.getByTestId('next-dealer')).toContainText('下一局 · 丙 做庄');

	// 刷新：下一局庄家仍在（账本推导，不是内存状态）
	await page.reload();
	await expect(page.getByTestId('next-dealer')).toContainText('下一局 · 丙 做庄');

	// 第二笔：闲家 120 分 → 闲家队上台 +1；下一局换到丙的下家丁
	await page.getByTestId('defenders-score').fill('120');
	await page.getByTestId('etch-submit').click();
	await expect(page.getByTestId('totals')).toContainText('3');
	await expect(page.getByTestId('next-dealer')).toContainText('下一局 · 丁 做庄');

	// 凿掉第二笔 → 下一局回到丙
	await page.getByTestId('entries').getByText('+1 乙').click();
	await page.getByRole('button', { name: '凿除' }).first().click(); // 展开确认
	await page.getByRole('button', { name: '凿除' }).first().click(); // 确认凿除
	await expect(page.getByTestId('next-dealer')).toContainText('下一局 · 丙 做庄');
});

test('掼蛋：按出完顺序记名次，推下一局进贡；刷新仍在；凿除回滚', async ({ page }) => {
	await page.goto('/');
	await page.getByTestId('tpl-card-guandan').click();
	const combo = page.getByTestId('player-combobox').locator('input');
	for (const name of ['甲', '乙', '丙', '丁']) {
		await combo.fill(name);
		await combo.press('Enter');
	}
	await page.getByTestId('start-tablet').click();
	await expect(page.getByTestId('board-title')).toBeVisible();

	// 双下：甲头游、丙二游、乙三游、丁自动补末游 → +3
	await page.getByTestId('finish-pick-seat-0').click();
	await page.getByTestId('finish-pick-seat-2').click();
	await page.getByTestId('finish-pick-seat-1').click();
	await expect(page.getByTestId('finish-slot-4')).toContainText('丁');
	await page.getByTestId('etch-submit').click();

	await expect(page.getByTestId('totals')).toContainText('Lv 3');
	await expect(page.getByTestId('last-finish')).toContainText('① 甲 ② 丙 ③ 乙 ④ 丁');
	await expect(page.getByTestId('tribute')).toContainText('乙、丁 → 甲、丙');

	// 刷新：名次与进贡仍在
	await page.reload();
	await expect(page.getByTestId('last-finish')).toContainText('① 甲 ② 丙 ③ 乙 ④ 丁');

	// 凿掉这一局 → 条消失
	await page.getByTestId('entries').getByText('+3 甲').click();
	await page.getByRole('button', { name: '凿除' }).first().click();
	await page.getByRole('button', { name: '凿除' }).first().click();
	await expect(page.getByTestId('round-setup')).toBeHidden();
});

test('CABO：小门槛宣告最低胜，碑不执法仍可刻', async ({ page }) => {
	await page.goto('/');
	await page.getByTestId('tpl-card-cabo').click();
	await page.getByTestId('cabo-threshold').fill('50');
	const combo = page.getByTestId('player-combobox').locator('input');
	for (const name of ['甲', '乙']) {
		await combo.fill(name);
		await combo.press('Enter');
	}
	await page.getByTestId('start-tablet').click();
	await expect(page.getByTestId('board-title')).toBeVisible();

	// 一轮：甲叫牌（0），乙吃 60 分 → 乙触线，最低分甲宣告获胜
	const rowB = page.getByTestId('etch-panel').locator('label', { hasText: '乙' }).locator('input');
	await rowB.fill('60');
	await page.getByTestId('etch-submit').click();

	await expect(page.getByTestId('proclamations')).toBeVisible();
	await expect(page.getByText('终局：甲 以最低分获胜（有人到 50）')).toBeVisible();

	// 碑不执法：宣告后仍可继续刻
	await page.getByTestId('etch-panel').getByRole('button', { name: '乙' }).click();
	const rowA = page.getByTestId('etch-panel').locator('label', { hasText: '甲' }).locator('input');
	await rowA.fill('10');
	await page.getByTestId('etch-submit').click();
	await expect(page.getByTestId('entries')).toContainText('+10');
});

test('PWA：断网后仍可打开（service worker）', async ({ page, context }) => {
	await page.goto('/');
	await expect(page.getByTestId('brand')).toBeVisible();
	// 等到页面真正被 SW 接管（ready 只保证 active，不保证 controller 已接管本页）
	await page.waitForFunction(
		async () => {
			const reg = await navigator.serviceWorker.ready;
			return !!reg.active && navigator.serviceWorker.controller !== null;
		},
		undefined,
		{ timeout: 15000 }
	);

	// 首次访问是被 SW 中途 claim 的，子资源请求不会经过 SW —— 这是 PWA 的通行约定：
	// 离线能力从"下一次导航"起生效。再走一次导航，让文档从一开始就受控。
	await page.reload();
	await expect(page.getByTestId('brand')).toBeVisible();
	expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

	await context.setOffline(true);
	await page.reload();
	await expect(page.getByTestId('brand')).toBeVisible();
});
