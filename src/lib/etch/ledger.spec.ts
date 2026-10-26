import { describe, expect, it } from 'vitest';
import {
	appendEntry,
	chisel,
	fold,
	isChiseled,
	LedgerError,
	manualEntry,
	newGame,
	nextSeq,
	roundOf,
	validateGame
} from './ledger';
import { doudizhuRound } from './templates/doudizhu';
import type { Game, Variant } from './types';

function mkGame(variant: Variant = { kind: 'generic' }, n = 3): Game {
	return newGame({
		templateId: 'generic',
		variant,
		players: Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `玩家${i + 1}` }))
	});
}

describe('appendEntry 不变量（守卫即断言：坏状态必须被拒）', () => {
	it('seq 必须恰好是下一号', () => {
		const g = mkGame();
		const g1 = appendEntry(g, manualEntry(1, [{ playerId: 'p1', delta: 5 }]));
		expect(g1.entries).toHaveLength(1);
		// 跳号必须被拒
		try {
			appendEntry(g1, manualEntry(3, [{ playerId: 'p1', delta: 1 }]));
			expect.unreachable('seq 跳号必须被拒');
		} catch (err) {
			expect(err instanceof LedgerError && err.code).toBe('seq-must-be-next');
		}
		// 回头号同样必须被拒
		try {
			appendEntry(g1, manualEntry(1, [{ playerId: 'p2', delta: 1 }]));
			expect.unreachable('seq 回退必须被拒');
		} catch (err) {
			expect(err instanceof LedgerError && err.code).toBe('seq-must-be-next');
		}
	});

	it('未知玩家的行被拒', () => {
		const g = mkGame();
		try {
			appendEntry(g, manualEntry(1, [{ playerId: 'stranger', delta: 1 }]));
			expect.unreachable('未知玩家必须被拒');
		} catch (err) {
			expect(err instanceof LedgerError && err.code).toBe('unknown-player');
		}
	});

	it('非凿除笔至少一行', () => {
		const g = mkGame();
		try {
			appendEntry(g, manualEntry(1, []));
			expect.unreachable('空笔必须被拒');
		} catch (err) {
			expect(err instanceof LedgerError && err.code).toBe('manual-entry-needs-lines');
		}
	});

	it('重复 id 被拒', () => {
		const g = mkGame();
		const e1 = manualEntry(1, [{ playerId: 'p1', delta: 1 }]);
		const g2 = appendEntry(g, e1);
		try {
			appendEntry(g2, { ...manualEntry(2, [{ playerId: 'p2', delta: 1 }]), id: e1.id });
			expect.unreachable('重复 id 必须被拒');
		} catch (err) {
			expect(err instanceof LedgerError && err.code).toBe('duplicate-entry-id');
		}
	});
});

describe('凿除', () => {
	it('凿掉一笔：划掉、不折叠、账本变长', () => {
		let g = mkGame();
		g = appendEntry(g, manualEntry(1, [{ playerId: 'p1', delta: 100 }]));
		g = appendEntry(g, manualEntry(2, [{ playerId: 'p2', delta: 5 }]));
		expect(fold(g)).toEqual({ p1: 100, p2: 5, p3: 0 });
		g = chisel(g, g.entries[0].id);
		expect(g.entries).toHaveLength(3);
		expect(isChiseled(g, g.entries[0].id)).toBe(true);
		expect(fold(g)).toEqual({ p1: 0, p2: 5, p3: 0 });
	});

	it('同一笔不可凿两次', () => {
		let g = mkGame();
		g = appendEntry(g, manualEntry(1, [{ playerId: 'p1', delta: 1 }]));
		g = chisel(g, g.entries[0].id);
		try {
			chisel(g, g.entries[0].id);
			expect.unreachable('二次凿除必须被拒');
		} catch (err) {
			expect(err instanceof LedgerError && err.code).toBe('chisel-target-already-chiseled');
		}
	});

	it('凿除笔不可被凿除', () => {
		let g = mkGame();
		g = appendEntry(g, manualEntry(1, [{ playerId: 'p1', delta: 1 }]));
		g = chisel(g, g.entries[0].id);
		const chiselEntry = g.entries[1];
		try {
			chisel(g, chiselEntry.id);
			expect.unreachable('凿除凿除笔必须被拒');
		} catch (err) {
			expect(err instanceof LedgerError && err.code).toBe('chisel-of-chisel');
		}
	});

	it('凿除不存在的笔被拒', () => {
		const g = mkGame();
		expect(() => chisel(g, 'nope')).toThrow(LedgerError);
	});

	it('凿除以整笔为单位：多行笔一凿全撤', () => {
		let g = mkGame({ kind: 'doudizhu' }, 3);
		const round = doudizhuRound(
			{ landlord: 'p1', landlordWon: true, base: 20, multiplier: 4 },
			g.players
		);
		g = appendEntry(g, {
			id: 'e1',
			seq: 1,
			ts: Date.now(),
			kind: 'template',
			lines: round.lines,
			note: round.note
		});
		expect(fold(g)).toEqual({ p1: 160, p2: -80, p3: -80 });
		g = chisel(g, 'e1');
		expect(fold(g)).toEqual({ p1: 0, p2: 0, p3: 0 });
	});
});

describe('roundOf / validateGame / nextSeq', () => {
	it('回合号：第几刻；凿除笔继承目标回合号', () => {
		let g = mkGame();
		g = appendEntry(g, { ...manualEntry(1, [{ playerId: 'p1', delta: 1 }]), id: 'a' });
		g = appendEntry(g, { ...manualEntry(2, [{ playerId: 'p2', delta: 1 }]), id: 'b' });
		g = chisel(g, 'a');
		expect(roundOf(g, g.entries[0])).toBe(1);
		expect(roundOf(g, g.entries[1])).toBe(2);
		expect(roundOf(g, g.entries[2])).toBe(1);
	});

	it('validateGame 重放坏账本被拒', () => {
		const g = mkGame();
		const broken: Game = {
			...g,
			entries: [{ id: 'x', seq: 7, ts: 1, kind: 'manual', lines: [{ playerId: 'p1', delta: 1 }] }]
		};
		expect(() => validateGame(broken)).toThrow(LedgerError);
	});

	it('nextSeq 恒为 length+1', () => {
		let g = mkGame();
		expect(nextSeq(g)).toBe(1);
		g = appendEntry(g, manualEntry(1, [{ playerId: 'p3', delta: -2 }]));
		expect(nextSeq(g)).toBe(2);
	});
});
