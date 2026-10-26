// 双升（两副牌升级）：闲家得分 → 升级数。4 人两队（座位 0-2 / 1-3），记的是级数。
// 换算表（全部由变体参数化，刻入只输闲家得分 0–200）：
//   闲家 0–79 分：庄家胜并升 —— 0 分（大光）3 级，大光奖励开 4 级；1–39 分 2 级；40–79 分 1 级
//   闲家 ≥80 分：闲家上台并升 N₈₀ + ⌊(分−80)/40⌋（N₈₀ = 变体 levelsAt80，0/1），
//                受封顶档截断（160 档 = N₈₀+2，200 档 = N₈₀+3，0 = 不封顶）
// 庄家流转：首庄开碑时定（firstDeclarerTeam），之后每笔由账本逐笔推导（见 declarerTeamOf）；
// ≥80 分换庄、<80 分连庄，用户在表单的改写以该笔 meta 为准。
// 允许倒级（默认关）：开启后表单可选「回退到第几级」（2..A 绝对目标，差值并入同笔）——
// 对应抠底房规（打 J 被副 J 抠回 5、主 J 抠回 3、A 被抠回 J），罕见、不做公式推导。
// 级牌阶梯 2..A 与掼蛋共用（levels.ts）；过 A 宣告封顶，碑不执法。

import type {
	Game,
	PlayerId,
	Proclamation,
	ShuangshengEntryMeta,
	ShuangshengVariant
} from '../types';
import { fold, isChiseled } from '../ledger';
import { LEVEL_CAP, levelName } from './levels';
import { teamOfSeat } from './teams';
import type { RoundResult, Template } from './index';

/** 满分：两副牌 5/10/K 共 200 分 */
export const SHUANGSHENG_MAX_SCORE = 200;
const TAKEOVER_SCORE = 80;
const RUNG = 40;

export interface ShuangshengInput {
	/** 本笔庄家队（通常 = declarerTeamOf 推导值，用户可改写） */
	declarerTeam: 0 | 1;
	/** 闲家得分，0–200 整数 */
	defendersScore: number;
	/** 回退（仅变体 allowRollback 开启时出现）：哪队被抠底、回到第几级（0 = 打 2 … 12 = 打 A） */
	rollback?: { team: 0 | 1; toLevel: number };
}

/** 闲家 <80 分时庄家的升级数：0 分大光 3（大光奖励 4）、1–39 分 2、40–79 分 1。 */
export function declarerGain(
	score: number,
	variant: Pick<ShuangshengVariant, 'grandWinBonus'>
): number {
	if (score <= 0) return variant.grandWinBonus ? 4 : 3;
	if (score < RUNG) return 2;
	return 1;
}

/** 闲家 ≥80 分时闲家的升级数；<80 分返回 null（未上台）。封顶档截断换算阶梯。 */
export function defenderGain(
	score: number,
	variant: Pick<ShuangshengVariant, 'levelsAt80' | 'defenderCapScore'>
): number | null {
	if (score < TAKEOVER_SCORE) return null;
	const base = variant.levelsAt80 + Math.floor((score - TAKEOVER_SCORE) / RUNG);
	if (variant.defenderCapScore === 0) return base;
	const capped = variant.levelsAt80 + (variant.defenderCapScore - TAKEOVER_SCORE) / RUNG;
	return Math.min(base, capped);
}

/** 另一队 */
export function otherTeam(team: 0 | 1): 0 | 1 {
	return team === 0 ? 1 : 0;
}

function assertScore(score: number): void {
	if (!Number.isInteger(score) || score < 0 || score > SHUANGSHENG_MAX_SCORE) {
		throw new Error(`闲家得分必须是 0–${SHUANGSHENG_MAX_SCORE} 的整数`);
	}
}

/** 一笔双升：胜方每人 +N（N=0 仍记 +0 行，账本要求非凿除笔至少一行），回退差值并入同笔。 */
export function shuangshengRound(
	input: ShuangshengInput,
	players: { id: PlayerId }[],
	variant: ShuangshengVariant,
	/** 各队当前级数（折叠得出），回退差值的基数 */
	teamLevels: Record<0 | 1, number>
): RoundResult {
	if (variant.kind !== 'shuangsheng') throw new Error('not a shuangsheng game');
	if (players.length !== 4) throw new Error('双升需要恰好 4 人');
	assertScore(input.defendersScore);
	if (input.rollback && !variant.allowRollback) {
		throw new Error('变体未允许倒级，不能回退');
	}
	if (
		input.rollback &&
		(!Number.isInteger(input.rollback.toLevel) ||
			input.rollback.toLevel < 0 ||
			input.rollback.toLevel >= LEVEL_CAP)
	) {
		throw new Error('回退目标级应在 2..A 之间');
	}

	const defendersWin = input.defendersScore >= TAKEOVER_SCORE;
	const winnerTeam: 0 | 1 = defendersWin ? otherTeam(input.declarerTeam) : input.declarerTeam;
	const gain = defendersWin
		? (defenderGain(input.defendersScore, variant) as number)
		: declarerGain(input.defendersScore, variant);

	// 按座位序累积每人增减：胜方 +N（含 +0），回退队另加 (目标级 − 当前级)
	const deltas = new Map<PlayerId, number>();
	for (const [seat, p] of players.entries()) {
		const team = teamOfSeat(seat);
		if (team === winnerTeam) deltas.set(p.id, (deltas.get(p.id) ?? 0) + gain);
		if (input.rollback && input.rollback.team === team) {
			deltas.set(
				p.id,
				(deltas.get(p.id) ?? 0) + (input.rollback.toLevel - (teamLevels[team] ?? 0))
			);
		}
	}

	const side = defendersWin ? 'X' : 'D';
	const rollbackNote = input.rollback ? `/R ${levelName(input.rollback.toLevel)}` : '';
	const meta: ShuangshengEntryMeta = input.rollback
		? {
				declarerTeam: input.declarerTeam,
				defendersScore: input.defendersScore,
				rollbackTeam: input.rollback.team,
				rollbackToLevel: input.rollback.toLevel
			}
		: { declarerTeam: input.declarerTeam, defendersScore: input.defendersScore };

	return {
		lines: [...deltas.entries()].map(([playerId, delta]) => ({ playerId, delta })),
		note: `${input.defendersScore}→${side}+${gain}${rollbackNote}`,
		meta
	};
}

/** 当前庄家队：从首庄起逐笔重放未凿笔的 meta——≥80 换庄、<80 连庄；无 meta 的笔（手工等）跳过。 */
export function declarerTeamOf(game: Game): 0 | 1 {
	const variant = game.variant;
	if (variant.kind !== 'shuangsheng') throw new Error('not a shuangsheng game');
	let declarer = variant.firstDeclarerTeam;
	for (const e of game.entries) {
		if (e.kind === 'chisel' || isChiseled(game, e.id)) continue;
		if (!e.meta) continue;
		declarer =
			e.meta.defendersScore >= TAKEOVER_SCORE
				? otherTeam(e.meta.declarerTeam)
				: e.meta.declarerTeam;
	}
	return declarer;
}

/** 各队当前级数（折叠）：取每队首位座位的合计（同队两人级数恒相同）。 */
export function teamLevelsOf(game: Game): Record<0 | 1, number> {
	const totals = fold(game);
	const levels: Record<0 | 1, number> = { 0: 0, 1: 0 };
	for (const [seat, p] of game.players.entries()) {
		levels[teamOfSeat(seat)] = totals[p.id] ?? 0;
	}
	return levels;
}

function detectShuangsheng(game: Game): Proclamation[] {
	const totals = fold(game);
	const proclamations: Proclamation[] = [];
	for (const p of game.players) {
		if ((totals[p.id] ?? 0) >= LEVEL_CAP) {
			proclamations.push({ kind: 'level-capped', playerId: p.id });
		}
	}
	return proclamations;
}

export const shuangsheng: Template<ShuangshengVariant> = {
	id: 'shuangsheng',
	names: { zh: '双升', en: 'Shuangsheng' },
	minPlayers: 4,
	maxPlayers: 4,
	teams: 'alternating-pairs',
	defaultVariant: {
		kind: 'shuangsheng',
		levelsAt80: 0,
		defenderCapScore: 0,
		grandWinBonus: false,
		allowRollback: false,
		firstDeclarerTeam: 0
	},
	detect: detectShuangsheng
};
