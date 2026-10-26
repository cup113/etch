import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EntryList from './EntryList.svelte';
import { appendEntry, manualEntry, newGame } from '../etch/ledger';
import type { Game } from '../etch/types';

function mkGame(): Game {
	return newGame({
		templateId: 'generic',
		variant: { kind: 'generic' },
		players: [
			{ id: 'p1', name: '老张' },
			{ id: 'p2', name: '李四' }
		]
	});
}

describe('EntryList', () => {
	it('最新在上；被凿的笔划掉且显示"已凿除"', async () => {
		let g = mkGame();
		g = appendEntry(g, { ...manualEntry(1, [{ playerId: 'p1', delta: 5 }]), id: 'e1' });
		g = appendEntry(g, { ...manualEntry(2, [{ playerId: 'p2', delta: 9 }]), id: 'e2' });
		g = appendEntry(g, { id: 'c1', seq: 3, ts: 1, kind: 'chisel', chisels: 'e1', lines: [] });
		render(EntryList, { game: g, onchisel: () => {} });

		await expect.element(page.getByTestId('entry-e2')).toBeVisible();
		await expect.element(page.getByTestId('entry-e1')).toBeVisible();
		await expect.element(page.getByTestId('entry-e1').getByText('已凿除')).toBeVisible();
		// 最新在上：e2（seq 2）在 e1（seq 1）之前
		const root = await page.getByTestId('entries').element();
		const order = Array.from(root!.querySelectorAll('[data-testid]')).map(
			(node) => node.getAttribute('data-testid') ?? ''
		);
		expect(order.indexOf('entry-e2')).toBeLessThan(order.indexOf('entry-e1'));
	});

	it('点开一笔 → 凿除两步确认 → onchisel 收到笔 id', async () => {
		let g = mkGame();
		g = appendEntry(g, { ...manualEntry(1, [{ playerId: 'p1', delta: 5 }]), id: 'e1' });

		const chiseled: string[] = [];
		render(EntryList, { game: g, onchisel: (id) => chiseled.push(id) });

		await page.getByTestId('entry-toggle-e1').click();
		await page.getByTestId('chisel-ask-e1').click();
		await expect.element(page.getByTestId('chisel-confirm-e1')).toBeVisible();
		await page.getByTestId('chisel-confirm-e1').click();

		expect(chiseled).toEqual(['e1']);
	});
});
