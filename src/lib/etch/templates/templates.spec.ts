import { describe, expect, it } from 'vitest';
import { appendEntry, fold, manualEntry, newGame } from '../ledger';
import { templateOf, templates } from './index';
import { doudizhuRound } from './doudizhu';
import { unoEliminationRound, unoRaceRound } from './uno';
import { GUANDAN_CAP, guandanRound, levelName, teamOfSeat } from './guandan';
import type { Game } from '../types';

function mkGame(templateId: Game['templateId'], variant: Game['variant'], n: number): Game {
	return newGame({
		templateId,
		variant,
		players: Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `玩家${i + 1}` }))
	});
}

describe('模板注册表', () => {
	it('四个模板齐备，人数边界一致', () => {
		expect(Object.keys(templates).sort()).toEqual(['doudizhu', 'generic', 'guandan', 'uno']);
		expect(templateOf('doudizhu').minPlayers).toBe(3);
		expect(templateOf('doudizhu').maxPlayers).toBe(3);
		expect(templateOf('guandan').teams).toBe('alternating-pairs');
		expect(templateOf('generic').maxPlayers).toBe(12);
	});
});

describe('斗地主：倍数对称', () => {
	it('地主胜：±2/∓1 份', () => {
		const g = mkGame('doudizhu', { kind: 'doudizhu' }, 3);
		const r = doudizhuRound({ landlord: 'p1', landlordWon: true, base: 20, multiplier: 4 }, g.players);
		expect(r.lines).toEqual([
			{ playerId: 'p1', delta: 160 },
			{ playerId: 'p2', delta: -80 },
			{ playerId: 'p3', delta: -80 }
		]);
		expect(r.note).toContain('地主');
	});

	it('农民胜：地主输双份', () => {
		const g = mkGame('doudizhu', { kind: 'doudizhu' }, 3);
		const r = doudizhuRound({ landlord: 'p2', landlordWon: false, base: 10, multiplier: 1 }, g.players);
		expect(r.lines).toEqual([
			{ playerId: 'p2', delta: -20 },
			{ playerId: 'p1', delta: 10 },
			{ playerId: 'p3', delta: 10 }
		]);
	});

	it('人数与参数校验', () => {
		const g2 = mkGame('doudizhu', { kind: 'doudizhu' }, 2);
		expect(() => doudizhuRound({ landlord: 'p1', landlordWon: true, base: 1, multiplier: 1 }, g2.players)).toThrow();
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
		const r = unoEliminationRound({ winner: 'p1', remainders: { p1: 0, p2: 12, p3: 40 } }, g.players);
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

describe('掼蛋：级数与过A', () => {
	it('胜队每人进级，双下跳级', () => {
		const g = mkGame('guandan', { kind: 'guandan', levelsPerDoubleDown: 2 }, 4);
		const normal = guandanRound({ winningTeam: 0, doubleDown: false }, g.players, g.variant);
		expect(normal.lines).toEqual([
			{ playerId: 'p1', delta: 1 },
			{ playerId: 'p3', delta: 1 }
		]);
		const double = guandanRound({ winningTeam: 1, doubleDown: true }, g.players, g.variant);
		expect(double.lines).toEqual([
			{ playerId: 'p2', delta: 2 },
			{ playerId: 'p4', delta: 2 }
		]);
	});

	it('座位成队 0-2 / 1-3；恰好 4 人', () => {
		expect([0, 1, 2, 3].map(teamOfSeat)).toEqual([0, 1, 0, 1]);
		const g3 = mkGame('guandan', { kind: 'guandan', levelsPerDoubleDown: 2 }, 3);
		expect(() => guandanRound({ winningTeam: 0, doubleDown: false }, g3.players, g3.variant)).toThrow();
	});

	it('级牌名与过A：级数 12 显示 A，≥13 宣告封顶', () => {
		expect(levelName(0)).toBe('2');
		expect(levelName(12)).toBe('A');
		expect(levelName(GUANDAN_CAP)).toBe('过A');
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
