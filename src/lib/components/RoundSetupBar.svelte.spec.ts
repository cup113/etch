import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import RoundSetupBar from './RoundSetupBar.svelte';
import { appendEntry, newGame, newId, nextSeq } from '../etch/ledger';
import { guandanRound } from '../etch/templates/guandan';
import type { Game, ShuangshengVariant } from '../etch/types';

const P4 = [
	{ id: 'p1', name: '甲' },
	{ id: 'p2', name: '乙' },
	{ id: 'p3', name: '丙' },
	{ id: 'p4', name: '丁' }
];

const SS = (over: Partial<ShuangshengVariant> = {}): ShuangshengVariant => ({
	kind: 'shuangsheng',
	levelsAt80: 0,
	defenderCapScore: 0,
	grandWinBonus: false,
	allowRollback: false,
	firstDeclarerTeam: 0,
	...over
});

/** 造一块双升碑；entries 里只写庄家/队/分数，够推导下一局 */
function ssGame(
	variant: ShuangshengVariant,
	entries: { declarer?: string; team: 0 | 1; score: number }[]
): Game {
	let g = newGame({ templateId: 'shuangsheng', variant, players: P4 });
	for (const e of entries) {
		g = appendEntry(g, {
			id: newId(),
			seq: nextSeq(g),
			ts: 1,
			kind: 'template',
			lines: [{ playerId: 'p1', delta: 0 }],
			note: '',
			meta: {
				kind: 'shuangsheng',
				declarerTeam: e.team,
				defendersScore: e.score,
				...(e.declarer ? { declarer: e.declarer } : {})
			}
		});
	}
	return g;
}

function gdGame(finish: [string, string, string, string]): Game {
	const g = newGame({
		templateId: 'guandan',
		variant: { kind: 'guandan', levelsPerDoubleDown: 3, levelsPerSingleDown: 2 },
		players: P4
	});
	const round = guandanRound({ finish }, g.players, g.variant);
	return appendEntry(g, {
		id: newId(),
		seq: 1,
		ts: 1,
		kind: 'template',
		lines: round.lines,
		note: round.note,
		meta: round.meta
	});
}

describe('RoundSetupBar · 双升', () => {
	it('首庄已知：本局；再刻一笔：下一局轮对家', async () => {
		render(RoundSetupBar, {
			game: ssGame(SS({ firstDeclarer: 'p1' }), [])
		});
		await expect.element(page.getByTestId('next-dealer')).toHaveTextContent('本局 · 甲 做庄');
	});

	it('庄家升后，下一局是对家', async () => {
		render(RoundSetupBar, {
			game: ssGame(SS({ firstDeclarer: 'p1' }), [{ declarer: 'p1', team: 0, score: 40 }])
		});
		await expect.element(page.getByTestId('next-dealer')).toHaveTextContent('下一局 · 丙 做庄');
	});

	it('旧笔只知队：显示队，庄家待定', async () => {
		render(RoundSetupBar, {
			game: ssGame(SS(), [{ team: 0, score: 40 }])
		});
		await expect.element(page.getByTestId('next-dealer')).toHaveTextContent('甲·丙 队（庄家待定）');
	});

	it('亮牌局：不显示推导出来的假下一家', async () => {
		render(RoundSetupBar, {
			game: ssGame(SS({ declarerFlow: 'reveal' }), [{ declarer: 'p1', team: 0, score: 40 }])
		});
		await expect.element(page.getByTestId('next-dealer')).toHaveTextContent('亮牌定庄');
	});
});

describe('RoundSetupBar · 掼蛋', () => {
	it('双下：上局名次 + 三游/末游 → 头游/二游', async () => {
		render(RoundSetupBar, { game: gdGame(['p1', 'p3', 'p2', 'p4']) });
		await expect.element(page.getByTestId('last-finish')).toHaveTextContent('① 甲 ② 丙 ③ 乙 ④ 丁');
		await expect
			.element(page.getByTestId('tribute'))
			.toHaveTextContent('下一局进贡 · 乙、丁 → 甲、丙（头游收大牌）');
	});

	it('单下：末游 → 头游', async () => {
		render(RoundSetupBar, { game: gdGame(['p1', 'p2', 'p3', 'p4']) });
		await expect.element(page.getByTestId('tribute')).toHaveTextContent('下一局进贡 · 丁 → 甲');
	});

	it('头游+末游：无进贡', async () => {
		render(RoundSetupBar, { game: gdGame(['p1', 'p2', 'p4', 'p3']) });
		await expect
			.element(page.getByTestId('tribute'))
			.toHaveTextContent('下一局进贡 · 无（末游在胜方）');
	});

	it('没有带 meta 的笔：整条不渲染', async () => {
		const g = newGame({
			templateId: 'guandan',
			variant: { kind: 'guandan', levelsPerDoubleDown: 3 },
			players: P4
		});
		render(RoundSetupBar, { game: g });
		await expect.element(page.getByTestId('round-setup')).not.toBeInTheDocument();
	});
});
