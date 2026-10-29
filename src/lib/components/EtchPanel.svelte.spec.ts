import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EtchPanel from './EtchPanel.svelte';
import { appendEntry, newGame, newId, nextSeq } from '../etch/ledger';
import { declarerTeamOf, shuangshengRound, teamLevelsOf } from '../etch/templates/shuangsheng';
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
	it('按出完顺序点人：双下 +3，第 4 人自动补', async () => {
		const rounds: RoundResult[] = [];
		render(EtchPanel, {
			game: mkGame({ kind: 'guandan', levelsPerDoubleDown: 3, levelsPerSingleDown: 2 }),
			onetch: (r) => rounds.push(r)
		});

		// 头游 老张、二游 王五、三游 李四；赵六自动补末游
		await page.getByTestId('finish-pick-seat-0').click();
		await page.getByTestId('finish-pick-seat-2').click();
		await page.getByTestId('finish-pick-seat-1').click();
		await expect.element(page.getByTestId('finish-slot-4')).toHaveTextContent('赵六');
		await expect.element(page.getByTestId('guandan-preview')).toHaveTextContent('双下 +3');

		await page.getByTestId('etch-submit').click();
		expect(rounds).toEqual([
			{
				lines: [
					{ playerId: 'p1', delta: 3 },
					{ playerId: 'p3', delta: 3 }
				],
				note: '+3',
				meta: { kind: 'guandan', finish: ['p1', 'p3', 'p2', 'p4'] }
			}
		]);
	});

	it('未满四人 → 报错且不产笔', async () => {
		const rounds: RoundResult[] = [];
		render(EtchPanel, {
			game: mkGame({ kind: 'guandan', levelsPerDoubleDown: 3, levelsPerSingleDown: 2 }),
			onetch: (r) => rounds.push(r)
		});

		await page.getByTestId('finish-pick-seat-0').click();
		await page.getByTestId('etch-submit').click();

		await expect.element(page.getByTestId('etch-error')).toBeVisible();
		expect(rounds).toEqual([]);
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

	/** 与 store.etch 相同的落账路径：造一笔已有账（双升 meta） */
	function withEntry(game: Game, declarer: string, score: number): Game {
		const round = shuangshengRound(
			{ declarer, defendersScore: score },
			game.players,
			game.variant as ShuangshengVariant,
			teamLevelsOf(game)
		);
		return appendEntry(game, {
			id: newId(),
			seq: nextSeq(game),
			ts: 1,
			kind: 'template',
			lines: round.lines,
			note: round.note,
			meta: round.meta
		});
	}

	/** 用一笔手动账把两队级数摆到指定值（只为展示/预览，不参与庄家推导）。 */
	function atLevels(game: Game, team0: number, team1: number): Game {
		return appendEntry(game, {
			id: newId(),
			seq: nextSeq(game),
			ts: 1,
			kind: 'manual',
			lines: game.players.map((p, seat) => ({
				playerId: p.id,
				delta: seat % 2 === 0 ? team0 : team1
			}))
		});
	}

	it('首局必须点庄家；40 分 → 庄家队 +1，meta 落笔', async () => {
		const game = mkGame(SS());
		expect(declarerTeamOf(game)).toBe(0);
		const rounds: RoundResult[] = [];
		render(EtchPanel, { game, onetch: (r) => rounds.push(r) });

		await page.getByTestId('dealer-seat-0').click();
		await page.getByTestId('defenders-score').fill('40');
		await page.getByTestId('etch-submit').click();

		expect(rounds).toEqual([
			{
				lines: [
					{ playerId: 'p1', delta: 1 },
					{ playerId: 'p3', delta: 1 }
				],
				note: '40→D+1',
				meta: { kind: 'shuangsheng', declarer: 'p1', declarerTeam: 0, defendersScore: 40 }
			}
		]);
	});

	it('没人可推导时必须先选庄家', async () => {
		const rounds: RoundResult[] = [];
		render(EtchPanel, {
			game: mkGame(SS({ declarerFlow: 'reveal' })),
			onetch: (r) => rounds.push(r)
		});

		await page.getByTestId('defenders-score').fill('40');
		await page.getByTestId('etch-submit').click();

		await expect.element(page.getByTestId('etch-error')).toBeVisible();
		expect(rounds).toEqual([]);
	});

	it('已有 40 分笔后默认对家；95 分上台 0 级仍成笔，且预览可见', async () => {
		const rounds: RoundResult[] = [];
		const game = withEntry(mkGame(SS()), 'p1', 40); // p1 连庄 → 下一局对家 p3
		render(EtchPanel, { game, onetch: (r) => rounds.push(r) });

		await expect.element(page.getByTestId('dealer-seat-2')).toBeVisible();
		const seat = await page.getByTestId('dealer-seat-2').element();
		expect(seat?.className).toContain('etch-chip-on');
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
				meta: { kind: 'shuangsheng', declarer: 'p3', declarerTeam: 0, defendersScore: 95 }
			}
		]);
	});

	it('指定模式：下局庄家可预存', async () => {
		const rounds: RoundResult[] = [];
		render(EtchPanel, {
			game: mkGame(SS({ declarerFlow: 'designate' })),
			onetch: (r) => rounds.push(r)
		});

		await page.getByTestId('dealer-seat-0').click();
		await page.getByTestId('defenders-score').fill('40');
		await page.getByTestId('next-declarer-seat-3').click();
		await page.getByTestId('etch-submit').click();

		expect(rounds).toEqual([
			{
				lines: [
					{ playerId: 'p1', delta: 1 },
					{ playerId: 'p3', delta: 1 }
				],
				note: '40→D+1',
				meta: {
					kind: 'shuangsheng',
					declarer: 'p1',
					declarerTeam: 0,
					defendersScore: 40,
					nextDeclarer: 'p4'
				}
			}
		]);
	});

	it('允许倒级：回退区出现，目标级差值并入同笔', async () => {
		const rounds: RoundResult[] = [];
		render(EtchPanel, {
			game: mkGame(SS({ allowRollback: true, firstDeclarerTeam: 1 })),
			onetch: (r) => rounds.push(r)
		});

		await page.getByTestId('dealer-seat-1').click();
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
				meta: {
					kind: 'shuangsheng',
					declarer: 'p2',
					declarerTeam: 1,
					defendersScore: 95,
					rollbackTeam: 1,
					rollbackToLevel: 3
				}
			}
		]);
	});

	it('未允许倒级：无回退区', async () => {
		render(EtchPanel, { game: mkGame(SS()), onetch: () => {} });
		const found = await page.getByTestId('rollback-toggle').elements();
		expect(found.length).toBe(0);
	});

	it('A 必打：K 庄家 0 分预览截到 +1，刻入同笔', async () => {
		const rounds: RoundResult[] = [];
		const game = atLevels(mkGame(SS({ mustPlay: 'A', firstDeclarer: 'p1' })), 11, 0);
		render(EtchPanel, { game, onetch: (r) => rounds.push(r) });

		await page.getByTestId('defenders-score').fill('0');
		await expect.element(page.getByTestId('ss-preview')).toHaveTextContent('庄家升 1 级（A 必打）');
		await page.getByTestId('etch-submit').click();

		expect(rounds).toEqual([
			{
				lines: [
					{ playerId: 'p1', delta: 1 },
					{ playerId: 'p3', delta: 1 }
				],
				note: '0→D+1→A',
				meta: { kind: 'shuangsheng', declarer: 'p1', declarerTeam: 0, defendersScore: 0 }
			}
		]);
	});

	it('A 必打：A 做闲家 200 分预览只换庄，刻入 +0', async () => {
		const rounds: RoundResult[] = [];
		const game = atLevels(mkGame(SS({ mustPlay: 'A', firstDeclarer: 'p1' })), 0, 12);
		render(EtchPanel, { game, onetch: (r) => rounds.push(r) });

		await page.getByTestId('defenders-score').fill('200');
		await expect
			.element(page.getByTestId('ss-preview'))
			.toHaveTextContent('闲家上台，只换庄（A 必打）');
		await page.getByTestId('etch-submit').click();

		expect(rounds).toEqual([
			{
				lines: [
					{ playerId: 'p2', delta: 0 },
					{ playerId: 'p4', delta: 0 }
				],
				note: '200→X+0→A',
				meta: { kind: 'shuangsheng', declarer: 'p1', declarerTeam: 0, defendersScore: 200 }
			}
		]);
	});

	it('A 必打：庄家在 A 时显示必打 badge', async () => {
		const game = atLevels(mkGame(SS({ mustPlay: 'A', firstDeclarer: 'p1' })), 12, 0);
		render(EtchPanel, { game, onetch: () => {} });

		await expect.element(page.getByTestId('ss-must-play-badge')).toHaveTextContent('A 必打');
	});
});
