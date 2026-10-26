// UNO：目标累积型，两种变体（CONTEXT.md「变体」）：
//  - race（升）：赢家收走对手剩牌点数，先到 threshold（默认 500）宣告胜。
//  - elimination（降）：各吃各的剩牌分，谁先 ≥ threshold（默认 300）宣告出局；
//    仅剩一人未触线时宣告其为最后站立者。碑不执法：出局者仍可继续被刻。

import type { Game, PlayerId, PlayerRef, Proclamation } from '../types';
import { fold } from '../ledger';
import type { RoundResult, Template } from './index';

export interface UnoRaceInput {
	/** 本局赢家 */
	winner: PlayerId;
	/** 每位非赢家手中的剩牌点数 */
	remainders: Record<PlayerId, number>;
}

export interface UnoEliminationInput {
	/** 本局出完牌的人（记 0 分，不产生行） */
	winner: PlayerId;
	/** 每个人（含赢家）手中的剩牌点数；赢家应为 0 */
	remainders: Record<PlayerId, number>;
}

function assertNonNegativePoints(remainders: Record<PlayerId, number>, players: PlayerRef[]): void {
	for (const p of players) {
		const pts = remainders[p.id];
		if (pts === undefined) throw new Error(`缺少 ${p.name} 的剩牌点数`);
		if (!Number.isInteger(pts) || pts < 0) throw new Error('剩牌点数必须是不小于 0 的整数');
	}
}

/** race 变体：赢家 +Σ对手剩牌，其余人不产生行。 */
export function unoRaceRound(input: UnoRaceInput, players: PlayerRef[]): RoundResult {
	assertNonNegativePoints(input.remainders, players);
	if (input.remainders[input.winner] !== 0) {
		throw new Error('赢家的剩牌点数应为 0');
	}
	const gained = players.reduce((sum, p) => (p.id === input.winner ? sum : sum + input.remainders[p.id]), 0);
	// 收 0 点的一局仍是一笔（账本要求非凿除笔至少一行）：记赢家 +0
	return {
		lines: [{ playerId: input.winner, delta: gained }],
		note: `收 ${gained} 点`
	};
}

/** elimination 变体：每个非赢家 +自己手中的剩牌点数。 */
export function unoEliminationRound(input: UnoEliminationInput, players: PlayerRef[]): RoundResult {
	assertNonNegativePoints(input.remainders, players);
	if (input.remainders[input.winner] !== 0) {
		throw new Error('出牌者的剩牌点数应为 0');
	}
	const lines = players
		.filter((p) => p.id !== input.winner && input.remainders[p.id] > 0)
		.map((p) => ({ playerId: p.id, delta: input.remainders[p.id] }));
	if (lines.length === 0) {
		// 无人吃分的一局仍是一笔：记出牌者 +0
		lines.push({ playerId: input.winner, delta: 0 });
	}
	const note = lines.length === 1 && lines[0].delta === 0 ? '无人吃分' : `吃分 ${lines.reduce((s, l) => s + l.delta, 0)} 点`;
	return { lines, note };
}

function detectUno(game: Game): Proclamation[] {
	const variant = game.variant;
	if (variant.kind !== 'uno') return [];
	const totals = fold(game);
	const eliminated: PlayerId[] = [];
	for (const p of game.players) {
		if ((totals[p.id] ?? 0) >= variant.threshold) eliminated.push(p.id);
	}
	if (variant.mode === 'race') {
		// race：先到线者宣告获胜（多人同线全部宣告——碑只提示，不裁决）
		return eliminated.map((playerId) => ({
			kind: 'race-won' as const,
			playerId,
			threshold: variant.threshold
		}));
	}
	// elimination：触线者出局；仅剩一人未触线时宣告最后站立者
	const standing = game.players.filter((p) => !eliminated.includes(p.id));
	const proclamations: Proclamation[] = eliminated.map((playerId) => ({
		kind: 'eliminated' as const,
		playerId,
		threshold: variant.threshold
	}));
	if (eliminated.length > 0 && standing.length === 1) {
		proclamations.push({
			kind: 'last-standing',
			playerId: standing[0].id,
			threshold: variant.threshold
		});
	}
	return proclamations;
}

export const uno: Template<{
	kind: 'uno';
	mode: 'race' | 'elimination';
	threshold: number;
}> = {
	id: 'uno',
	names: { zh: 'UNO', en: 'UNO' },
	minPlayers: 2,
	maxPlayers: 10,
	defaultVariant: { kind: 'uno', mode: 'race', threshold: 500 },
	detect: detectUno
};

export const unoEliminationDefaults = { kind: 'uno', mode: 'elimination', threshold: 300 } as const;
