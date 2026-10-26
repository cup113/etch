import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TotalsGrid from './TotalsGrid.svelte';
import { appendEntry, manualEntry, newGame } from '../etch/ledger';
import type { Game, Variant } from '../etch/types';

function mkGame(variant: Variant = { kind: 'generic' }): Game {
	return newGame({
		templateId: 'generic',
		variant,
		players: [
			{ id: 'p1', name: '老张' },
			{ id: 'p2', name: '李四' }
		]
	});
}

describe('TotalsGrid', () => {
	it('渲染折叠后的总分', async () => {
		let g = mkGame();
		g = appendEntry(g, manualEntry(1, [{ playerId: 'p1', delta: 100 }]));
		g = appendEntry(g, manualEntry(2, [{ playerId: 'p2', delta: -30 }]));
		render(TotalsGrid, { game: g });

		await expect.element(page.getByTestId('total-p1')).toHaveTextContent(/老张\s*100/);
		await expect.element(page.getByTestId('total-p2')).toHaveTextContent(/李四\s*-30/);
	});

	it('被凿的笔不计入', async () => {
		let g = mkGame();
		g = appendEntry(g, { ...manualEntry(1, [{ playerId: 'p1', delta: 100 }]), id: 'e1' });
		g = appendEntry(g, manualEntry(2, [{ playerId: 'p1', delta: 7 }]));
		g = appendEntry(g, { id: 'c1', seq: 3, ts: 1, kind: 'chisel', chisels: 'e1', lines: [] });
		render(TotalsGrid, { game: g });

		await expect.element(page.getByTestId('total-p1')).toHaveTextContent(/老张\s*7/);
	});

	it('掼蛋碑显示级牌名', async () => {
		let g = newGame({
			templateId: 'guandan',
			variant: { kind: 'guandan', levelsPerDoubleDown: 2 },
			players: [
				{ id: 'p1', name: '甲' },
				{ id: 'p2', name: '乙' },
				{ id: 'p3', name: '丙' },
				{ id: 'p4', name: '丁' }
			]
		});
		g = appendEntry(g, manualEntry(1, [{ playerId: 'p1', delta: 12 }]));
		render(TotalsGrid, { game: g });

		await expect.element(page.getByTestId('total-p1')).toHaveTextContent(/甲\s*A/);
	});
});
