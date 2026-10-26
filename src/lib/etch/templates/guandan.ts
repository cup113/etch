// 掼蛋：队伍级数型。4 人两队（座位 0-2 / 1-3），记的是级数不是分数。
// 笔 = 胜方每人 +N 级（普通胜 N=1，双下 N=变体 levelsPerDoubleDown，默认 2）。
// 级牌序列 2..A 共 13 级；过 A（级数 ≥ 13）宣告封顶。贡牌等细则后置。

import type { Game, PlayerId, Proclamation, Variant } from '../types';
import { fold } from '../ledger';
import type { RoundResult, Template } from './index';

/** 级牌名：级数 0 显示 GUANDAN_LEVELS[0]='2'，级数 12 = 'A'。过 A = 级数 ≥ 13。 */
export const GUANDAN_LEVELS = [
	'2',
	'3',
	'4',
	'5',
	'6',
	'7',
	'8',
	'9',
	'10',
	'J',
	'Q',
	'K',
	'A'
] as const;
export const GUANDAN_CAP = GUANDAN_LEVELS.length; // 13

export function levelName(level: number): string {
	return level >= GUANDAN_CAP ? '过A' : (GUANDAN_LEVELS[level] ?? '?');
}

/** 座位 i 的队：0-2 一队，1-3 一队 */
export function teamOfSeat(seat: number): 0 | 1 {
	return seat % 2 === 0 ? 0 : 1;
}

export interface GuandanInput {
	/** 获胜队伍 */
	winningTeam: 0 | 1;
	/** 双下（对方双游）则按变体跳级 */
	doubleDown: boolean;
}

export function guandanRound(
	input: GuandanInput,
	players: { id: PlayerId }[],
	variant: Variant
): RoundResult {
	if (variant.kind !== 'guandan') throw new Error('not a guandan game');
	if (players.length !== 4) throw new Error('掼蛋需要恰好 4 人');
	const levels = input.doubleDown ? variant.levelsPerDoubleDown : 1;
	const lines = players
		.map((p, seat) => ({ p, seat }))
		.filter(({ seat }) => teamOfSeat(seat) === input.winningTeam)
		.map(({ p }) => ({ playerId: p.id, delta: levels }));
	return {
		lines,
		note: `+${levels}`
	};
}

function detectGuandan(game: Game): Proclamation[] {
	const totals = fold(game);
	const proclamations: Proclamation[] = [];
	for (const p of game.players) {
		if ((totals[p.id] ?? 0) >= GUANDAN_CAP) {
			proclamations.push({ kind: 'level-capped', playerId: p.id });
		}
	}
	return proclamations;
}

export const guandan: Template<{ kind: 'guandan'; levelsPerDoubleDown: 1 | 2 | 3 }> = {
	id: 'guandan',
	names: { zh: '掼蛋', en: 'Guandan' },
	minPlayers: 4,
	maxPlayers: 4,
	teams: 'alternating-pairs',
	defaultVariant: { kind: 'guandan', levelsPerDoubleDown: 2 },
	detect: detectGuandan
};
