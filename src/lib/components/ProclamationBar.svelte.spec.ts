import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ProclamationBar from './ProclamationBar.svelte';
import { appendEntry, manualEntry, newGame } from '../etch/ledger';
import type { Game } from '../etch/types';

function mkUno(mode: 'race' | 'elimination'): Game {
	return newGame({
		templateId: 'uno',
		variant: { kind: 'uno', mode, threshold: mode === 'race' ? 500 : 300 },
		players: [
			{ id: 'p1', name: '老张' },
			{ id: 'p2', name: '李四' }
		]
	});
}

describe('ProclamationBar（碑不执法）', () => {
	it('race 到线：宣告到达，不锁任何操作（无 disabled 态可断言，宣告就是全部）', async () => {
		let g = mkUno('race');
		g = appendEntry(g, manualEntry(1, [{ playerId: 'p1', delta: 500 }]));
		render(ProclamationBar, { game: g });

		await expect.element(page.getByTestId('proclamations')).toBeVisible();
		await expect.element(page.getByText('老张 到达 500 分')).toBeVisible();
	});

	it('未触线：无宣告区块', async () => {
		let g = mkUno('race');
		g = appendEntry(g, manualEntry(1, [{ playerId: 'p1', delta: 499 }]));
		render(ProclamationBar, { game: g });

		await expect.element(page.getByTestId('proclamations')).not.toBeInTheDocument();
	});

	it('elimination：触线出局 + 最后站立', async () => {
		let g = mkUno('elimination');
		g = appendEntry(g, manualEntry(1, [{ playerId: 'p1', delta: 300 }]));
		render(ProclamationBar, { game: g });

		await expect.element(page.getByText('老张 出局（300 分）')).toBeVisible();
		await expect.element(page.getByText('只剩 李四 未触线')).toBeVisible();
	});
});
