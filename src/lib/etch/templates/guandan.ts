// 掼蛋：队伍级数型。4 人两队（座位 0-2 / 1-3），记的是级数不是分数。
// 笔 = 胜方每人 +N 级：N 由同伴名次查变体表——二游（双下）取 levelsPerDoubleDown（默认 3），
// 三游（单下）取 levelsPerSingleDown（默认 2，旧碑缺省回落 1），末游恒 1。
// 级牌序列 2..A 共 13 级；过 A（级数 ≥ 13）宣告封顶。贡牌等细则后置。

import type { Game, GuandanVariant, PlayerId, Proclamation, Variant } from '../types';
import { fold } from '../ledger';
import { LEVEL_CAP as GUANDAN_CAP, LEVEL_NAMES as GUANDAN_LEVELS, levelName } from './levels';
import { teamOfSeat } from './teams';
import type { RoundResult, Template } from './index';

export { GUANDAN_LEVELS, GUANDAN_CAP, levelName };
export { teamOfSeat } from './teams';

export interface GuandanInput {
	/** 获胜队伍 */
	winningTeam: 0 | 1;
	/** 头游同伴的名次：2 = 二游（双下）、3 = 三游（单下）、4 = 末游 */
	partnerRank: 2 | 3 | 4;
}

/** 同伴名次 → 进级数。旧碑 levelsPerSingleDown 缺省按 1（升级前"普通胜恒 1 级"）。 */
export function levelsForRank(
	partnerRank: 2 | 3 | 4,
	variant: Pick<GuandanVariant, 'levelsPerDoubleDown' | 'levelsPerSingleDown'>
): number {
	if (partnerRank === 2) return variant.levelsPerDoubleDown;
	if (partnerRank === 3) return variant.levelsPerSingleDown ?? 1;
	return 1;
}

export function guandanRound(
	input: GuandanInput,
	players: { id: PlayerId }[],
	variant: Variant
): RoundResult {
	if (variant.kind !== 'guandan') throw new Error('not a guandan game');
	if (players.length !== 4) throw new Error('掼蛋需要恰好 4 人');
	const levels = levelsForRank(input.partnerRank, variant);
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

export const guandan: Template<GuandanVariant> = {
	id: 'guandan',
	names: { zh: '掼蛋', en: 'Guandan' },
	minPlayers: 4,
	maxPlayers: 4,
	teams: 'alternating-pairs',
	// 官方默认：双下 3 级、单下 2 级；开碑页可调成房规（双下 2 / 单下 1）
	defaultVariant: { kind: 'guandan', levelsPerDoubleDown: 3, levelsPerSingleDown: 2 },
	detect: detectGuandan
};
