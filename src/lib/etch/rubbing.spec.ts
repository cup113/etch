import { describe, expect, it } from 'vitest';
import { appendEntry, manualEntry, newGame, nextSeq, newId } from './ledger';
import { rub, unrub, RubbingError } from './rubbing';
import { guandanRound } from './templates/guandan';

function mkGame() {
	let g = newGame({
		templateId: 'generic',
		variant: { kind: 'generic' },
		players: [
			{ id: 'p1', name: '老张' },
			{ id: 'p2', name: '李四' }
		]
	});
	g = appendEntry(g, manualEntry(1, [{ playerId: 'p1', delta: 3 }]));
	g = appendEntry(g, manualEntry(2, [{ playerId: 'p2', delta: -3 }]));
	return g;
}

describe('拓片', () => {
	it('rub → unrub 往返一致（含被凿笔）', () => {
		let g = mkGame();
		g = appendEntry(g, {
			id: 'c1',
			seq: 3,
			ts: 1,
			kind: 'chisel',
			chisels: g.entries[0].id,
			lines: []
		});
		const restored = unrub(rub(g));
		expect(restored).toEqual(g);
		expect(restored.entries).toHaveLength(3);
	});

	it('坏 JSON 被拒', () => {
		expect(() => unrub('{oops')).toThrow(RubbingError);
	});

	it('非拓片被拒', () => {
		expect(() => unrub('{"hello":1}')).toThrow(RubbingError);
	});

	it('版本不匹配被拒', () => {
		const bad = JSON.parse(rub(mkGame()));
		bad.etch = 99;
		expect(() => unrub(JSON.stringify(bad))).toThrow(/版本不支持/);
	});

	it('账本被篡改（seq 断裂）被拒', () => {
		const bad = JSON.parse(rub(mkGame()));
		bad.game.entries[1].seq = 9;
		expect(() => unrub(JSON.stringify(bad))).toThrow(/校验失败/);
	});

	it('新模板拓片可导入（cabo / shuangsheng）', () => {
		for (const game of [
			newGame({
				templateId: 'cabo',
				variant: { kind: 'cabo', threshold: 100 },
				players: [{ id: 'p1', name: '甲' }]
			}),
			newGame({
				templateId: 'shuangsheng',
				variant: {
					kind: 'shuangsheng',
					levelsAt80: 0,
					defenderCapScore: 0,
					grandWinBonus: false,
					allowRollback: false,
					firstDeclarerTeam: 0
				},
				players: [
					{ id: 'p1', name: '甲' },
					{ id: 'p2', name: '乙' },
					{ id: 'p3', name: '丙' },
					{ id: 'p4', name: '丁' }
				]
			})
		]) {
			expect(unrub(rub(game)).templateId).toBe(game.templateId);
		}
	});

	it('旧 v1 掼蛋拓片（无 levelsPerSingleDown）导入回落为旧行为', () => {
		const g = newGame({
			templateId: 'guandan',
			variant: { kind: 'guandan', levelsPerDoubleDown: 3, levelsPerSingleDown: 2 },
			players: [
				{ id: 'p1', name: '甲' },
				{ id: 'p2', name: '乙' },
				{ id: 'p3', name: '丙' },
				{ id: 'p4', name: '丁' }
			]
		});
		const legacy = JSON.parse(rub(g));
		delete legacy.game.variant.levelsPerSingleDown;
		const restored = unrub(JSON.stringify(legacy));
		expect(restored.variant).toEqual({ kind: 'guandan', levelsPerDoubleDown: 3 });
		// 三游按旧行为 1 级
		const round = guandanRound(
			{ finish: ['p1', 'p2', 'p3', 'p4'] },
			restored.players,
			restored.variant
		);
		expect(round.lines.every((l) => l.delta === 1)).toBe(true);
	});

	it('双升笔的 meta 随拓片往返保留（庄家重放的依据）', () => {
		let g = newGame({
			templateId: 'shuangsheng',
			variant: {
				kind: 'shuangsheng',
				levelsAt80: 1,
				defenderCapScore: 160,
				grandWinBonus: true,
				allowRollback: true,
				firstDeclarerTeam: 1
			},
			players: [
				{ id: 'p1', name: '甲' },
				{ id: 'p2', name: '乙' },
				{ id: 'p3', name: '丙' },
				{ id: 'p4', name: '丁' }
			]
		});
		const meta = { declarerTeam: 1 as const, defendersScore: 95 };
		g = appendEntry(g, {
			id: newId(),
			seq: nextSeq(g),
			ts: 1,
			kind: 'template',
			lines: [
				{ playerId: 'p1', delta: 1 },
				{ playerId: 'p3', delta: 1 }
			],
			note: '95→X+1',
			meta
		});
		const restored = unrub(rub(g));
		expect(restored.entries[0].meta).toEqual(meta);
	});

	it('碑名随拓片往返保留；非字符串碑名被拒', () => {
		const g = { ...mkGame(), name: '周五晚' };
		expect(unrub(rub(g)).name).toBe('周五晚');

		const bad = JSON.parse(rub(g));
		bad.game.name = 123;
		expect(() => unrub(JSON.stringify(bad))).toThrow(/数据不完整/);
	});

	it('新 meta 随拓片往返：双升庄家/预指定、掼蛋名次', () => {
		let ss = newGame({
			templateId: 'shuangsheng',
			variant: {
				kind: 'shuangsheng',
				levelsAt80: 0,
				defenderCapScore: 0,
				grandWinBonus: false,
				allowRollback: false,
				firstDeclarerTeam: 0,
				declarerFlow: 'designate'
			},
			players: [
				{ id: 'p1', name: '甲' },
				{ id: 'p2', name: '乙' },
				{ id: 'p3', name: '丙' },
				{ id: 'p4', name: '丁' }
			]
		});
		const ssMeta = {
			kind: 'shuangsheng' as const,
			declarer: 'p1',
			declarerTeam: 0 as const,
			defendersScore: 40,
			nextDeclarer: 'p2'
		};
		ss = appendEntry(ss, {
			id: newId(),
			seq: nextSeq(ss),
			ts: 1,
			kind: 'template',
			lines: [{ playerId: 'p1', delta: 1 }],
			note: '40→D+1',
			meta: ssMeta
		});
		expect(unrub(rub(ss)).entries[0].meta).toEqual(ssMeta);

		let gd = newGame({
			templateId: 'guandan',
			variant: { kind: 'guandan', levelsPerDoubleDown: 3, levelsPerSingleDown: 2 },
			players: [
				{ id: 'p1', name: '甲' },
				{ id: 'p2', name: '乙' },
				{ id: 'p3', name: '丙' },
				{ id: 'p4', name: '丁' }
			]
		});
		const round = guandanRound({ finish: ['p1', 'p3', 'p2', 'p4'] }, gd.players, gd.variant);
		gd = appendEntry(gd, {
			id: newId(),
			seq: nextSeq(gd),
			ts: 1,
			kind: 'template',
			lines: round.lines,
			note: round.note,
			meta: round.meta
		});
		expect(unrub(rub(gd)).entries[0].meta).toEqual({
			kind: 'guandan',
			finish: ['p1', 'p3', 'p2', 'p4']
		});
	});

	it('坏 meta 被拒：掼蛋名次缺人 / 双升庄家与队不一致', () => {
		const gd = newGame({
			templateId: 'guandan',
			variant: { kind: 'guandan', levelsPerDoubleDown: 3, levelsPerSingleDown: 2 },
			players: [
				{ id: 'p1', name: '甲' },
				{ id: 'p2', name: '乙' },
				{ id: 'p3', name: '丙' },
				{ id: 'p4', name: '丁' }
			]
		});
		const round = guandanRound({ finish: ['p1', 'p3', 'p2', 'p4'] }, gd.players, gd.variant);
		const gdGame = appendEntry(gd, {
			id: newId(),
			seq: nextSeq(gd),
			ts: 1,
			kind: 'template',
			lines: round.lines,
			note: round.note,
			meta: round.meta
		});
		const badGd = JSON.parse(rub(gdGame));
		badGd.game.entries[0].meta.finish = ['p1', 'p2', 'p3'];
		expect(() => unrub(JSON.stringify(badGd))).toThrow(/校验失败/);

		const ss = newGame({
			templateId: 'shuangsheng',
			variant: {
				kind: 'shuangsheng',
				levelsAt80: 0,
				defenderCapScore: 0,
				grandWinBonus: false,
				allowRollback: false,
				firstDeclarerTeam: 0
			},
			players: [
				{ id: 'p1', name: '甲' },
				{ id: 'p2', name: '乙' },
				{ id: 'p3', name: '丙' },
				{ id: 'p4', name: '丁' }
			]
		});
		const ssGame = appendEntry(ss, {
			id: newId(),
			seq: nextSeq(ss),
			ts: 1,
			kind: 'template',
			lines: [{ playerId: 'p1', delta: 1 }],
			note: '40→D+1',
			meta: { declarerTeam: 0, defendersScore: 40 }
		});
		const badSs = JSON.parse(rub(ssGame));
		badSs.game.entries[0].meta.declarer = 'p2';
		expect(() => unrub(JSON.stringify(badSs))).toThrow(/校验失败/);
	});
});
