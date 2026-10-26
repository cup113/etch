import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EtchPanel from './EtchPanel.svelte';
import { newGame } from '../etch/ledger';
import { declarerTeamOf } from '../etch/templates/shuangsheng';
import type { Game, ShuangshengVariant, Variant } from '../etch/types';
import type { RoundResult } from '../etch/templates';

function mkGame(variant: Variant): Game {
	const templateId =
		variant.kind === 'uno'
			? 'uno'
			: variant.kind === 'guandan'
				? 'guandan'
				: variant.kind === 'cabo'
					? 'cabo'
					: variant.kind === 'shuangsheng'
						? 'shuangsheng'
						: 'generic';
	return newGame({
		templateId,
		variant,
		players:
			variant.kind === 'guandan' || variant.kind === 'shuangsheng'
				? [
						{ id: 'p1', name: '老张' },
						{ id: 'p2', name: '李四' },
						{ id: 'p3', name: '王五' },
						{ id: 'p4', name: '赵六' }
					]
				: [
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

describe('EtchPanel · 掼蛋', () => {
	it('胜队 + 同伴名次查表进级（默认三游）', async () => {
		const rounds: RoundResult[] = [];
		render(EtchPanel, {
			game: mkGame({ kind: 'guandan', levelsPerDoubleDown: 3, levelsPerSingleDown: 2 }),
			onetch: (r) => rounds.push(r)
		});

		// 默认三游 → +2
		await page.getByTestId('etch-submit').click();
		expect(rounds).toEqual([
			{
				lines: [
					{ playerId: 'p1', delta: 2 },
					{ playerId: 'p3', delta: 2 }
				],
				note: '+2'
			}
		]);

		// 改选二游（双下）→ +3
		await page.getByTestId('rank-2').click();
		await page.getByTestId('etch-submit').click();
		expect(rounds[1]).toEqual({
			lines: [
				{ playerId: 'p1', delta: 3 },
				{ playerId: 'p3', delta: 3 }
			],
			note: '+3'
		});
	});
});

describe('EtchPanel · CABO', () => {
	it('叫牌者记 0，其余输剩牌点数', async () => {
		const rounds: RoundResult[] = [];
		render(EtchPanel, {
			game: mkGame({ kind: 'cabo', threshold: 100 }),
			onetch: (r) => rounds.push(r)
		});

		await page.getByTestId('cabo-pts-p2').fill('12');
		await page.getByTestId('cabo-pts-p3').fill('40');
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
			game: mkGame({ kind: 'cabo', threshold: 100 }),
			onetch: (r) => rounds.push(r)
		});

		await page.getByTestId('cabo-pts-p2').fill('12');
		await page.getByTestId('etch-submit').click();

		await expect.element(page.getByTestId('etch-error')).toBeVisible();
		expect(rounds).toEqual([]);
	});
});

describe('EtchPanel · 双升', () => {
	const SS = (over: Partial<ShuangshengVariant> = {}): ShuangshengVariant => ({
		kind: 'shuangsheng',
		levelsAt80: 0,
		defenderCapScore: 0,
		grandWinBonus: false,
		allowRollback: false,
		firstDeclarerTeam: 0,
		...over
	});

	it('只输分数：默认庄家为推导值，40 分 → 庄家队 +1，meta 落笔', async () => {
		const game = mkGame(SS());
		expect(declarerTeamOf(game)).toBe(0);
		const rounds: RoundResult[] = [];
		render(EtchPanel, { game, onetch: (r) => rounds.push(r) });

		await page.getByTestId('defenders-score').fill('40');
		await page.getByTestId('etch-submit').click();

		expect(rounds).toEqual([
			{
				lines: [
					{ playerId: 'p1', delta: 1 },
					{ playerId: 'p3', delta: 1 }
				],
				note: '40→D+1',
				meta: { declarerTeam: 0, defendersScore: 40 }
			}
		]);
	});

	it('95 分上台 0 级仍成笔，且预览可见', async () => {
		const rounds: RoundResult[] = [];
		render(EtchPanel, { game: mkGame(SS()), onetch: (r) => rounds.push(r) });

		await page.getByTestId('defenders-score').fill('95');
		await expect.element(page.getByTestId('ss-preview')).toBeVisible();
		await page.getByTestId('etch-submit').click();

		expect(rounds).toEqual([
			{
				lines: [
					{ playerId: 'p2', delta: 0 },
					{ playerId: 'p4', delta: 0 }
				],
				note: '95→X+0',
				meta: { declarerTeam: 0, defendersScore: 95 }
			}
		]);
	});

	it('允许倒级：回退区出现，目标级差值并入同笔', async () => {
		const rounds: RoundResult[] = [];
		render(EtchPanel, {
			game: mkGame(SS({ allowRollback: true, firstDeclarerTeam: 1 })),
			onetch: (r) => rounds.push(r)
		});

		await page.getByTestId('defenders-score').fill('95');
		await page.getByTestId('rollback-toggle').click();
		await page.getByTestId('rollback-team-1').click();
		// select 的 option value 即级牌名（Svelte 未写 value 属性），按 '5' 选 → 级 3
		await page.getByTestId('rollback-level').selectOptions('5');
		await page.getByTestId('etch-submit').click();

		// 庄 1（首庄推导），95 分 → 闲家队（0）上台 +0；队 1 回退到 '5'（级 3，当前 0）→ +3
		expect(rounds).toEqual([
			{
				lines: [
					{ playerId: 'p1', delta: 0 },
					{ playerId: 'p2', delta: 3 },
					{ playerId: 'p3', delta: 0 },
					{ playerId: 'p4', delta: 3 }
				],
				note: '95→X+0/R 5',
				meta: { declarerTeam: 1, defendersScore: 95, rollbackTeam: 1, rollbackToLevel: 3 }
			}
		]);
	});

	it('未允许倒级：无回退区', async () => {
		render(EtchPanel, { game: mkGame(SS()), onetch: () => {} });
		const found = await page.getByTestId('rollback-toggle').elements();
		expect(found.length).toBe(0);
	});
});
