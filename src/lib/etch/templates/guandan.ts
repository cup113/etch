// 掼蛋：队伍级数型。4 人两队（座位 0-2 / 1-3），记的是级数不是分数。
// 一笔 = 一局的出完顺序（头游/二游/三游/末游）：胜方每人 +N，N 由头游同伴的名次查变体表——
// 二游（双下）取 levelsPerDoubleDown（默认 3），三游（单下）取 levelsPerSingleDown（默认 2，旧碑缺省回落 1），末游恒 1。
// 进贡只由名次推关系与规则提示（不记具体贡牌、不落抗贡状态）：
//   单下：末游 → 头游；双下：三游、末游各进贡，头游收大牌；1+4（末游在胜方）：无进贡。
// 级牌序列 2..A 共 13 级；过 A（级数 ≥ 13）宣告封顶。

import type {
	Entry,
	EntryId,
	Game,
	GuandanEntryMeta,
	GuandanVariant,
	PlayerId,
	Proclamation,
	Variant
} from '../types';
import { fold, isChiseled } from '../ledger';
import { LEVEL_CAP as GUANDAN_CAP, LEVEL_NAMES as GUANDAN_LEVELS, levelName } from './levels';
import { teamOfSeat } from './teams';
import type { RoundResult, Template } from './index';

export { GUANDAN_LEVELS, GUANDAN_CAP, levelName };
export { teamOfSeat } from './teams';

export interface GuandanInput {
	/** 出完顺序：头游、二游、三游、末游；恰好 4 人、不重复、都在碑上 */
	finish: PlayerId[];
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

/** 出完顺序的座位序；校验 4 人、不重复、都在碑上。 */
function finishSeats(finish: PlayerId[], players: { id: PlayerId }[]): number[] {
	if (finish.length !== 4) throw new Error('掼蛋需要 4 人的出完顺序');
	const seats = finish.map((id) => players.findIndex((p) => p.id === id));
	if (seats.some((seat) => seat < 0)) throw new Error('出完顺序里有不在碑上的玩家');
	if (new Set(seats).size !== 4) throw new Error('出完顺序不能重复');
	return seats;
}

/** 头游同伴的名次：2 = 二游（双下）、3 = 三游（单下）、4 = 末游。 */
export function partnerRankOf(finish: PlayerId[], players: { id: PlayerId }[]): 2 | 3 | 4 {
	const seats = finishSeats(finish, players);
	const partnerSeat = seats[0] ^ 2; // 0↔2、1↔3：同队另一人
	const index = seats.indexOf(partnerSeat);
	if (index < 1) throw new Error('出完顺序缺少头游的同伴');
	return (index + 1) as 2 | 3 | 4;
}

export function guandanRound(
	input: GuandanInput,
	players: { id: PlayerId }[],
	variant: Variant
): RoundResult {
	if (variant.kind !== 'guandan') throw new Error('not a guandan game');
	if (players.length !== 4) throw new Error('掼蛋需要恰好 4 人');
	const seats = finishSeats(input.finish, players);
	const partnerRank = partnerRankOf(input.finish, players);
	const levels = levelsForRank(partnerRank, variant);
	const winningTeam = teamOfSeat(seats[0]);
	const lines = players
		.map((p, seat) => ({ p, seat }))
		.filter(({ seat }) => teamOfSeat(seat) === winningTeam)
		.map(({ p }) => ({ playerId: p.id, delta: levels }));
	const meta: GuandanEntryMeta = {
		kind: 'guandan',
		finish: [input.finish[0], input.finish[1], input.finish[2], input.finish[3]]
	};
	return {
		lines,
		note: `+${levels}`,
		meta
	};
}

/** 进贡关系（只到关系与规则提示，不对应具体牌）。 */
export type Tribute =
	| { kind: 'double'; payers: [PlayerId, PlayerId]; receivers: [PlayerId, PlayerId] }
	| { kind: 'single'; payer: PlayerId; receiver: PlayerId }
	| { kind: 'none' };

/** 由出完顺序推下一局进贡：双下 / 单下 / 1+4 无进贡。 */
export function tributeOf(finish: PlayerId[], players: { id: PlayerId }[]): Tribute {
	const rank = partnerRankOf(finish, players);
	if (rank === 2) {
		return {
			kind: 'double',
			payers: [finish[2], finish[3]],
			receivers: [finish[0], finish[1]]
		};
	}
	if (rank === 3) return { kind: 'single', payer: finish[3], receiver: finish[0] };
	return { kind: 'none' };
}

/** 笔的掼蛋 meta。 */
export function guandanMeta(entry: Entry): GuandanEntryMeta | null {
	return entry.meta?.kind === 'guandan' ? entry.meta : null;
}

/** 最近一笔未凿除的掼蛋名次；手工笔/凿除笔跳过，最后一笔被凿则回落到上一笔。 */
export function lastFinishOf(
	game: Game
): { entryId: EntryId; finish: [PlayerId, PlayerId, PlayerId, PlayerId] } | null {
	for (let i = game.entries.length - 1; i >= 0; i--) {
		const entry = game.entries[i];
		if (entry.kind === 'chisel' || isChiseled(game, entry.id)) continue;
		const meta = guandanMeta(entry);
		if (meta) return { entryId: entry.id, finish: meta.finish };
	}
	return null;
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
