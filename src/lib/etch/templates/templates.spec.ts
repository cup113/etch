import { describe, expect, it } from 'vitest';
import { appendEntry, fold, manualEntry, newGame, newId, nextSeq, chisel } from '../ledger';
import { templateOf, templates } from './index';
import { doudizhuRound } from './doudizhu';
import { unoEliminationRound, unoRaceRound } from './uno';
import { GUANDAN_CAP, guandanRound, levelName, teamOfSeat } from './guandan';
import { caboRound } from './cabo';
import {
	shuangshengRound,
	declarerTeamOf,
	teamLevelsOf,
	type ShuangshengInput
} from './shuangsheng';
import type { Game, ShuangshengVariant } from '../types';

function mkGame(templateId: Game['templateId'], variant: Game['variant'], n: number): Game {
	return newGame({
		templateId,
		variant,
		players: Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `玩家${i + 1}` }))
	});
}

describe('模板注册表', () => {
	it('六个模板齐备，人数边界一致', () => {
		expect(Object.keys(templates).sort()).toEqual([
			'cabo',
			'doudizhu',
			'generic',
			'guandan',
			'shuangsheng',
			'uno'
		]);
		expect(templateOf('doudizhu').minPlayers).toBe(3);
		expect(templateOf('doudizhu').maxPlayers).toBe(3);
		expect(templateOf('guandan').teams).toBe('alternating-pairs');
		expect(templateOf('guandan').defaultVariant).toEqual({
			kind: 'guandan',
			levelsPerDoubleDown: 3,
			levelsPerSingleDown: 2
		});
		expect(templateOf('cabo').minPlayers).toBe(2);
		expect(templateOf('cabo').maxPlayers).toBe(4);
		expect(templateOf('shuangsheng').minPlayers).toBe(4);
		expect(templateOf('shuangsheng').maxPlayers).toBe(4);
		expect(templateOf('shuangsheng').teams).toBe('alternating-pairs');
		expect(templateOf('generic').maxPlayers).toBe(12);
	});
});

describe('斗地主：倍数对称', () => {
	it('地主胜：±2/∓1 份', () => {
		const g = mkGame('doudizhu', { kind: 'doudizhu' }, 3);
		const r = doudizhuRound(
			{ landlord: 'p1', landlordWon: true, base: 20, multiplier: 4 },
			g.players
		);
		expect(r.lines).toEqual([
			{ playerId: 'p1', delta: 160 },
			{ playerId: 'p2', delta: -80 },
			{ playerId: 'p3', delta: -80 }
		]);
		expect(r.note).toBe('20×4');
	});

	it('农民胜：地主输双份', () => {
		const g = mkGame('doudizhu', { kind: 'doudizhu' }, 3);
		const r = doudizhuRound(
			{ landlord: 'p2', landlordWon: false, base: 10, multiplier: 1 },
			g.players
		);
		expect(r.lines).toEqual([
			{ playerId: 'p2', delta: -20 },
			{ playerId: 'p1', delta: 10 },
			{ playerId: 'p3', delta: 10 }
		]);
	});

	it('人数与参数校验', () => {
		const g2 = mkGame('doudizhu', { kind: 'doudizhu' }, 2);
		expect(() =>
			doudizhuRound({ landlord: 'p1', landlordWon: true, base: 1, multiplier: 1 }, g2.players)
		).toThrow();
		const g3 = mkGame('doudizhu', { kind: 'doudizhu' }, 3);
		expect(() =>
			doudizhuRound({ landlord: 'p1', landlordWon: true, base: 0, multiplier: 1 }, g3.players)
		).toThrow();
		expect(() =>
			doudizhuRound({ landlord: 'p1', landlordWon: true, base: 1, multiplier: 0 }, g3.players)
		).toThrow();
	});
});

describe('UNO：两种变体', () => {
	it('race：赢家收对手剩牌点', () => {
		const g = mkGame('uno', { kind: 'uno', mode: 'race', threshold: 500 }, 3);
		const r = unoRaceRound({ winner: 'p1', remainders: { p1: 0, p2: 30, p3: 7 } }, g.players);
		expect(r.lines).toEqual([{ playerId: 'p1', delta: 37 }]);
	});

	it('race：赢家剩牌非 0 被拒；收 0 点仍成一笔', () => {
		const g = mkGame('uno', { kind: 'uno', mode: 'race', threshold: 500 }, 2);
		expect(() => unoRaceRound({ winner: 'p1', remainders: { p1: 5, p2: 3 } }, g.players)).toThrow();
		const r = unoRaceRound({ winner: 'p1', remainders: { p1: 0, p2: 0 } }, g.players);
		expect(r.lines).toEqual([{ playerId: 'p1', delta: 0 }]);
	});

	it('elimination：各吃各的', () => {
		const g = mkGame('uno', { kind: 'uno', mode: 'elimination', threshold: 300 }, 3);
		const r = unoEliminationRound(
			{ winner: 'p1', remainders: { p1: 0, p2: 12, p3: 40 } },
			g.players
		);
		expect(r.lines).toEqual([
			{ playerId: 'p2', delta: 12 },
			{ playerId: 'p3', delta: 40 }
		]);
	});

	it('detect：race 到线宣告胜', () => {
		let g = mkGame('uno', { kind: 'uno', mode: 'race', threshold: 500 }, 2);
		g = appendEntry(g, manualEntry(1, [{ playerId: 'p1', delta: 500 }]));
		expect(templateOf('uno').detect?.(g)).toEqual([
			{ kind: 'race-won', playerId: 'p1', threshold: 500 }
		]);
	});

	it('detect：elimination 触线出局，仅剩一人时宣告最后站立', () => {
		let g = mkGame('uno', { kind: 'uno', mode: 'elimination', threshold: 300 }, 3);
		g = appendEntry(g, manualEntry(1, [{ playerId: 'p1', delta: 320 }]));
		// p2、p3 仍未触线：只宣告 p1 出局，不宣告最后站立
		expect(templateOf('uno').detect?.(g)).toEqual([
			{ kind: 'eliminated', playerId: 'p1', threshold: 300 }
		]);
		// p2 也触线后仅剩 p3：宣告 p3 最后站立
		g = appendEntry(g, manualEntry(2, [{ playerId: 'p2', delta: 310 }]));
		expect(templateOf('uno').detect?.(g)).toEqual([
			{ kind: 'eliminated', playerId: 'p1', threshold: 300 },
			{ kind: 'eliminated', playerId: 'p2', threshold: 300 },
			{ kind: 'last-standing', playerId: 'p3', threshold: 300 }
		]);
		// 未触线者不宣告
		let g2 = mkGame('uno', { kind: 'uno', mode: 'elimination', threshold: 300 }, 3);
		g2 = appendEntry(g2, manualEntry(1, [{ playerId: 'p1', delta: 299 }]));
		expect(templateOf('uno').detect?.(g2)).toEqual([]);
	});
});

describe('掼蛋：进级表与过A', () => {
	it('同伴名次查表进级：二游 / 三游 / 末游', () => {
		const g = mkGame(
			'guandan',
			{ kind: 'guandan', levelsPerDoubleDown: 3, levelsPerSingleDown: 2 },
			4
		);
		const r2 = guandanRound({ winningTeam: 0, partnerRank: 2 }, g.players, g.variant);
		expect(r2.lines).toEqual([
			{ playerId: 'p1', delta: 3 },
			{ playerId: 'p3', delta: 3 }
		]);
		expect(r2.note).toBe('+3');
		const r3 = guandanRound({ winningTeam: 1, partnerRank: 3 }, g.players, g.variant);
		expect(r3.lines).toEqual([
			{ playerId: 'p2', delta: 2 },
			{ playerId: 'p4', delta: 2 }
		]);
		const r4 = guandanRound({ winningTeam: 0, partnerRank: 4 }, g.players, g.variant);
		expect(r4.lines).toEqual([
			{ playerId: 'p1', delta: 1 },
			{ playerId: 'p3', delta: 1 }
		]);
	});

	it('旧碑回落：levelsPerSingleDown 缺省按 1；旧值 1 容忍', () => {
		// 升级前的变体形状（无 levelsPerSingleDown）——三游按旧行为 1 级
		const g = mkGame('guandan', { kind: 'guandan', levelsPerDoubleDown: 2 }, 4);
		const r3 = guandanRound({ winningTeam: 0, partnerRank: 3 }, g.players, g.variant);
		expect(r3.lines).toEqual([
			{ playerId: 'p1', delta: 1 },
			{ playerId: 'p3', delta: 1 }
		]);
		const legacy = mkGame('guandan', { kind: 'guandan', levelsPerDoubleDown: 1 }, 4);
		const r2 = guandanRound({ winningTeam: 0, partnerRank: 2 }, legacy.players, legacy.variant);
		expect(r2.lines).toEqual([
			{ playerId: 'p1', delta: 1 },
			{ playerId: 'p3', delta: 1 }
		]);
	});

	it('座位成队 0-2 / 1-3；恰好 4 人', () => {
		expect([0, 1, 2, 3].map(teamOfSeat)).toEqual([0, 1, 0, 1]);
		const g3 = mkGame(
			'guandan',
			{ kind: 'guandan', levelsPerDoubleDown: 2, levelsPerSingleDown: 1 },
			3
		);
		expect(() =>
			guandanRound({ winningTeam: 0, partnerRank: 2 }, g3.players, g3.variant)
		).toThrow();
	});

	it('级牌名与过A：级数 12 显示 A，≥13 宣告封顶；负级数（倒级防御）钳到 2', () => {
		expect(levelName(0)).toBe('2');
		expect(levelName(12)).toBe('A');
		expect(levelName(GUANDAN_CAP)).toBe('过A');
		expect(levelName(-1)).toBe('2');
		let g = mkGame('guandan', { kind: 'guandan', levelsPerDoubleDown: 2 }, 4);
		for (let seq = 1; seq <= 13; seq++) {
			g = appendEntry(
				g,
				manualEntry(seq, [
					{ playerId: 'p1', delta: 1 },
					{ playerId: 'p3', delta: 1 }
				])
			);
		}
		expect(fold(g).p1).toBe(13);
		expect(templateOf('guandan').detect?.(g)).toEqual([
			{ kind: 'level-capped', playerId: 'p1' },
			{ kind: 'level-capped', playerId: 'p3' }
		]);
	});
});

describe('双升：分数换算', () => {
	const P4 = [
		{ id: 'p1', name: '甲' },
		{ id: 'p2', name: '乙' },
		{ id: 'p3', name: '丙' },
		{ id: 'p4', name: '丁' }
	];
	const L0 = { 0: 0, 1: 0 };
	const V = (over: Partial<ShuangshengVariant> = {}): ShuangshengVariant => ({
		kind: 'shuangsheng',
		levelsAt80: 0,
		defenderCapScore: 0,
		grandWinBonus: false,
		allowRollback: false,
		firstDeclarerTeam: 0,
		...over
	});

	it('庄家侧：0 分大光 3（大光奖励 4）、1–39 分 2、40–79 分 1', () => {
		const round = (score: number, v = V()) =>
			shuangshengRound({ declarerTeam: 0, defendersScore: score }, P4, v, L0);
		expect(round(0).lines).toEqual([
			{ playerId: 'p1', delta: 3 },
			{ playerId: 'p3', delta: 3 }
		]);
		expect(round(0).note).toBe('0→D+3');
		expect(round(0, V({ grandWinBonus: true })).lines).toEqual([
			{ playerId: 'p1', delta: 4 },
			{ playerId: 'p3', delta: 4 }
		]);
		expect(round(1).lines.every((l) => l.delta === 2)).toBe(true);
		expect(round(39).lines.every((l) => l.delta === 2)).toBe(true);
		expect(round(40).lines.every((l) => l.delta === 1)).toBe(true);
		expect(round(79).lines.every((l) => l.delta === 1)).toBe(true);
	});

	it('闲家侧：≥80 上台，N₈₀ 平移阶梯，封顶档截断', () => {
		const gainOf = (score: number, v = V()) =>
			shuangshengRound({ declarerTeam: 0, defendersScore: score }, P4, v, L0).lines[0].delta;
		// N₈₀ = 0：80→0、120→1、160→2、200→3
		expect(gainOf(80)).toBe(0);
		expect(gainOf(119)).toBe(0);
		expect(gainOf(120)).toBe(1);
		expect(gainOf(160)).toBe(2);
		expect(gainOf(200)).toBe(3);
		// N₈₀ = 1：整条阶梯平移
		expect(gainOf(80, V({ levelsAt80: 1 }))).toBe(1);
		expect(gainOf(120, V({ levelsAt80: 1 }))).toBe(2);
		expect(gainOf(200, V({ levelsAt80: 1 }))).toBe(4);
		// 封顶 160 = N₈₀+2 档；200 = N₈₀+3 档
		expect(gainOf(200, V({ defenderCapScore: 160 }))).toBe(2);
		expect(gainOf(200, V({ defenderCapScore: 160, levelsAt80: 1 }))).toBe(3);
		expect(gainOf(200, V({ defenderCapScore: 200, levelsAt80: 1 }))).toBe(4);
	});

	it('闲家上台换算给闲家队（庄家的对方），庄家胜给庄家队；80 分 0 级仍成笔', () => {
		const takeover = shuangshengRound({ declarerTeam: 0, defendersScore: 120 }, P4, V(), L0);
		expect(takeover.lines).toEqual([
			{ playerId: 'p2', delta: 1 },
			{ playerId: 'p4', delta: 1 }
		]);
		expect(takeover.note).toBe('120→X+1');
		expect(takeover.meta).toEqual({ declarerTeam: 0, defendersScore: 120 });
		const zero = shuangshengRound({ declarerTeam: 1, defendersScore: 80 }, P4, V(), L0);
		expect(zero.lines).toEqual([
			{ playerId: 'p1', delta: 0 },
			{ playerId: 'p3', delta: 0 }
		]);
		expect(zero.note).toBe('80→X+0');
	});

	it('回退：目标级差值并入同笔；变体未允许时拒绝', () => {
		const teamLevels = { 0: 8, 1: 5 };
		const round = shuangshengRound(
			{ declarerTeam: 0, defendersScore: 40, rollback: { team: 1, toLevel: 3 } },
			P4,
			V({ allowRollback: true }),
			teamLevels
		);
		expect(round.lines).toEqual([
			{ playerId: 'p1', delta: 1 },
			{ playerId: 'p2', delta: -2 },
			{ playerId: 'p3', delta: 1 },
			{ playerId: 'p4', delta: -2 }
		]);
		expect(round.note).toBe('40→D+1/R 5');
		expect(round.meta).toEqual({
			declarerTeam: 0,
			defendersScore: 40,
			rollbackTeam: 1,
			rollbackToLevel: 3
		});
		expect(() =>
			shuangshengRound(
				{ declarerTeam: 0, defendersScore: 40, rollback: { team: 1, toLevel: 3 } },
				P4,
				V(),
				teamLevels
			)
		).toThrow(/倒级/);
	});

	it('分数越界 / 非整数拒绝', () => {
		for (const bad of [-1, 201, 1.5]) {
			expect(() =>
				shuangshengRound({ declarerTeam: 0, defendersScore: bad }, P4, V(), L0)
			).toThrow();
		}
	});
});

describe('双升：庄家流转', () => {
	const V = (over: Partial<ShuangshengVariant> = {}): ShuangshengVariant => ({
		kind: 'shuangsheng',
		levelsAt80: 0,
		defenderCapScore: 0,
		grandWinBonus: false,
		allowRollback: false,
		firstDeclarerTeam: 1,
		...over
	});

	/** 与 store.etch 相同的落账路径：算行、带 meta 追加 */
	function etchSS(g: Game, input: ShuangshengInput): Game {
		const round = shuangshengRound(
			input,
			g.players,
			g.variant as ShuangshengVariant,
			teamLevelsOf(g)
		);
		return appendEntry(g, {
			id: newId(),
			seq: nextSeq(g),
			ts: 1,
			kind: 'template',
			lines: round.lines,
			note: round.note,
			meta: round.meta
		});
	}

	it('首庄起：连庄、上台换庄、凿除回滚、无 meta 笔跳过、改写尊重', () => {
		let g = mkGame('shuangsheng', V(), 4);
		expect(declarerTeamOf(g)).toBe(1);

		g = etchSS(g, { declarerTeam: 1, defendersScore: 40 }); // 连庄
		expect(declarerTeamOf(g)).toBe(1);

		g = etchSS(g, { declarerTeam: 1, defendersScore: 95 }); // 上台换庄
		expect(declarerTeamOf(g)).toBe(0);

		// 手工笔（无 meta）不改变庄家
		g = appendEntry(g, manualEntry(nextSeq(g), [{ playerId: 'p1', delta: 1 }]));
		expect(declarerTeamOf(g)).toBe(0);

		// 凿掉上台那笔 → 庄家回到 1（重放与折叠口径一致）
		g = chisel(g, g.entries[1].id);
		expect(declarerTeamOf(g)).toBe(1);
	});

	it('表单改写庄家以该笔 meta 为准；teamLevelsOf 折叠出各队级数', () => {
		const g = mkGame('shuangsheng', V({ firstDeclarerTeam: 0 }), 4);
		const g2 = etchSS(g, { declarerTeam: 0, defendersScore: 10 }); // 10 分庄升 2
		expect(teamLevelsOf(g2)).toEqual({ 0: 2, 1: 0 });
		// 推导庄家仍是 0，但本笔改写成庄 1：庄 1 胜 40 分 → 队 1 +1，之后连庄
		const g3 = etchSS(g2, { declarerTeam: 1, defendersScore: 40 });
		expect(declarerTeamOf(g3)).toBe(1);
		expect(teamLevelsOf(g3)).toEqual({ 0: 2, 1: 1 });
	});

	it('过 A 宣告封顶', () => {
		let g = mkGame('shuangsheng', V({ firstDeclarerTeam: 0 }), 4);
		for (let i = 0; i < 3; i++) {
			g = etchSS(g, { declarerTeam: 0, defendersScore: 0 }); // 大光 +3 ×3 = 9
		}
		for (let i = 0; i < 4; i++) {
			g = etchSS(g, { declarerTeam: 0, defendersScore: 40 }); // +1 ×4 → 13 过 A
		}
		expect(templateOf('shuangsheng').detect?.(g)).toEqual([
			{ kind: 'level-capped', playerId: 'p1' },
			{ kind: 'level-capped', playerId: 'p3' }
		]);
	});
});

describe('CABO：正向累加与最低胜宣告', () => {
	it('叫牌者记 0，其余各记剩牌点数', () => {
		const g = mkGame('cabo', { kind: 'cabo', threshold: 100 }, 3);
		const r = caboRound({ caller: 'p1', points: { p1: 0, p2: 12, p3: 40 } }, g.players);
		expect(r.lines).toEqual([
			{ playerId: 'p2', delta: 12 },
			{ playerId: 'p3', delta: 40 }
		]);
		expect(r.note).toBe('+52');
	});

	it('无人吃分的一轮：叫牌者 +0 兜底成笔', () => {
		const g = mkGame('cabo', { kind: 'cabo', threshold: 100 }, 2);
		const r = caboRound({ caller: 'p1', points: { p1: 0, p2: 0 } }, g.players);
		expect(r.lines).toEqual([{ playerId: 'p1', delta: 0 }]);
	});

	it('校验：叫牌者点数非 0 / 负数 / 缺人 拒绝', () => {
		const g = mkGame('cabo', { kind: 'cabo', threshold: 100 }, 2);
		expect(() => caboRound({ caller: 'p1', points: { p1: 5, p2: 3 } }, g.players)).toThrow();
		expect(() => caboRound({ caller: 'p1', points: { p1: 0, p2: -1 } }, g.players)).toThrow();
		expect(() => caboRound({ caller: 'p1', points: { p1: 0 } }, g.players)).toThrow();
	});

	it('detect：触线宣告最低分者胜；并列全部宣告；未触线不宣告', () => {
		let g = mkGame('cabo', { kind: 'cabo', threshold: 100 }, 3);
		g = appendEntry(g, manualEntry(1, [{ playerId: 'p1', delta: 120 }]));
		// p1 触线，p2/p3 并列最低（0 分）→ 都宣告
		expect(templateOf('cabo').detect?.(g)).toEqual([
			{ kind: 'cabo-finished', playerId: 'p2', threshold: 100 },
			{ kind: 'cabo-finished', playerId: 'p3', threshold: 100 }
		]);
		g = appendEntry(g, manualEntry(2, [{ playerId: 'p2', delta: 105 }]));
		// 触线 p1/p2，p3 唯一最低
		expect(templateOf('cabo').detect?.(g)).toEqual([
			{ kind: 'cabo-finished', playerId: 'p3', threshold: 100 }
		]);
		const g2 = mkGame('cabo', { kind: 'cabo', threshold: 100 }, 2);
		const g3 = appendEntry(g2, manualEntry(1, [{ playerId: 'p1', delta: 99 }]));
		expect(templateOf('cabo').detect?.(g3)).toEqual([]);
	});
});
