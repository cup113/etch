import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EtchPanel from './EtchPanel.svelte';
import { newGame } from '../etch/ledger';
import type { Game } from '../etch/types';
import type { RoundResult } from '../etch/templates';

function mkGame(variant: Game['variant']): Game {
	return newGame({
		templateId: variant.kind === 'uno' ? 'uno' : variant.kind === 'guandan' ? 'guandan' : 'generic',
		variant,
		players: [
			{ id: 'p1', name: '老张' },
			{ id: 'p2', name: '李四' },
			{ id: 'p3', name: '王五' }
		]
	});
}

describe('EtchPanel · 通用', () => {
	it('两名玩家的增减 → 一笔两行', async () => {
		const rounds: RoundResult[] = [];
		render(EtchPanel, { game: mkGame({ kind: 'generic' }), onetch: (r) => rounds.push(r) });

		await page.getByTestId('delta-p1').fill('30');
		await page.getByTestId('delta-p2').fill('-30');
		await page.getByTestId('etch-submit').click();

		expect(rounds).toEqual([
			{
				lines: [
					{ playerId: 'p1', delta: 30 },
					{ playerId: 'p2', delta: -30 }
				],
				note: '+30 -30'
			}
		]);
	});

	it('全空/全零 → 报错且不产笔', async () => {
		const rounds: RoundResult[] = [];
		render(EtchPanel, { game: mkGame({ kind: 'generic' }), onetch: (r) => rounds.push(r) });

		await page.getByTestId('delta-p1').fill('0');
		await page.getByTestId('etch-submit').click();

		await expect.element(page.getByTestId('etch-error')).toBeVisible();
		expect(rounds).toEqual([]);
	});
});

describe('EtchPanel · UNO', () => {
	it('elimination：各吃各的剩牌分', async () => {
		const rounds: RoundResult[] = [];
		render(EtchPanel, {
			game: mkGame({ kind: 'uno', mode: 'elimination', threshold: 300 }),
			onetch: (r) => rounds.push(r)
		});

		await page.getByTestId('winner-p1').click();
		await page.getByTestId('rem-p2').fill('12');
		await page.getByTestId('rem-p3').fill('40');
		await page.getByTestId('etch-submit').click();

		expect(rounds).toEqual([
			{
				lines: [
					{ playerId: 'p2', delta: 12 },
					{ playerId: 'p3', delta: 40 }
				],
				note: '+52'
			}
		]);
	});

	it('漏填点数 → 报错', async () => {
		const rounds: RoundResult[] = [];
		render(EtchPanel, {
			game: mkGame({ kind: 'uno', mode: 'race', threshold: 500 }),
			onetch: (r) => rounds.push(r)
		});

		await page.getByTestId('rem-p2').fill('5');
		await page.getByTestId('etch-submit').click();

		await expect.element(page.getByTestId('etch-error')).toBeVisible();
		expect(rounds).toEqual([]);
	});
});
