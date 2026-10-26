// CABO：正向累加、触线终局（官方口径）。每轮选"出完 / 叫牌者"记 0，
// 其余人各记手中剩牌点数；到 threshold（默认 100）宣告当前最低分者胜。
// 碑不执法：触线只宣告不锁刻；叫错罚分等房规由用户直接折进输入的数字。

import type { CaboVariant, Game, PlayerId, PlayerRef, Proclamation } from '../types';
import { fold } from '../ledger';
import type { RoundResult, Template } from './index';

export interface CaboInput {
	/** 本轮出完牌 / 叫牌者（记 0，不产生行） */
	caller: PlayerId;
	/** 每人（含叫牌者）手中的剩牌点数；叫牌者应为 0 */
	points: Record<PlayerId, number>;
}

function assertNonNegativePoints(points: Record<PlayerId, number>, players: PlayerRef[]): void {
	for (const p of players) {
		const pts = points[p.id];
		if (pts === undefined) throw new Error(`缺少 ${p.name} 的剩牌点数`);
		if (!Number.isInteger(pts) || pts < 0) throw new Error('剩牌点数必须是不小于 0 的整数');
	}
}

/** 一轮 CABO：每个非叫牌者 +自己手中的剩牌点数。 */
export function caboRound(input: CaboInput, players: PlayerRef[]): RoundResult {
	assertNonNegativePoints(input.points, players);
	if (input.points[input.caller] !== 0) {
		throw new Error('叫牌者的剩牌点数应为 0');
	}
	const lines = players
		.filter((p) => p.id !== input.caller && input.points[p.id] > 0)
		.map((p) => ({ playerId: p.id, delta: input.points[p.id] }));
	if (lines.length === 0) {
		// 无人吃分的一轮仍是一笔：记叫牌者 +0
		lines.push({ playerId: input.caller, delta: 0 });
	}
	return { lines, note: `+${lines.reduce((s, l) => s + l.delta, 0)}` };
}

function detectCabo(game: Game): Proclamation[] {
	const variant = game.variant;
	if (variant.kind !== 'cabo') return [];
	const totals = fold(game);
	const crossed = game.players.filter((p) => (totals[p.id] ?? 0) >= variant.threshold);
	if (crossed.length === 0) return [];
	// 有人触线 → 终局，宣告当前最低分者胜（并列全部宣告——碑只提示，不裁决）
	const min = Math.min(...game.players.map((p) => totals[p.id] ?? 0));
	return game.players
		.filter((p) => (totals[p.id] ?? 0) === min)
		.map((p) => ({ kind: 'cabo-finished' as const, playerId: p.id, threshold: variant.threshold }));
}

export const cabo: Template<CaboVariant> = {
	id: 'cabo',
	names: { zh: 'CABO', en: 'CABO' },
	minPlayers: 2,
	maxPlayers: 4,
	defaultVariant: { kind: 'cabo', threshold: 100 },
	detect: detectCabo
};
