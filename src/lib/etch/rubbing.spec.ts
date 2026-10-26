import { describe, expect, it } from 'vitest';
import { appendEntry, manualEntry, newGame } from './ledger';
import { rub, unrub, RubbingError } from './rubbing';

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
});
