// 斗地主：倍数对称型。地主 ±2 份、农民各 ∓1 份，一份 = 底分 × 倍数。
// 一局结果一次刻入（一笔含全桌的行）；v1 仅 3 人局，无终局检测。

import type { PlayerId, PlayerRef } from '../types';
import type { RoundResult, Template } from './index';

export interface DoudizhuInput {
	landlord: PlayerId;
	landlordWon: boolean;
	/** 底分，> 0 */
	base: number;
	/** 倍数，≥ 1 */
	multiplier: number;
}

export function doudizhuRound(input: DoudizhuInput, players: PlayerRef[]): RoundResult {
	if (!Number.isInteger(input.base) || input.base <= 0) {
		throw new Error('底分必须是正整数');
	}
	if (!Number.isInteger(input.multiplier) || input.multiplier < 1) {
		throw new Error('倍数必须是不小于 1 的整数');
	}
	const unit = input.base * input.multiplier;
	const farmers = players.filter((p) => p.id !== input.landlord);
	if (players.length !== 3 || farmers.length !== 2) {
		throw new Error('斗地主 v1 仅支持 3 人局（1 地主 + 2 农民）');
	}
	const landlordDelta = (input.landlordWon ? 2 : -2) * unit;
	const farmerDelta = (input.landlordWon ? -1 : 1) * unit;
	return {
		lines: [
			{ playerId: input.landlord, delta: landlordDelta },
			...farmers.map((p) => ({ playerId: p.id, delta: farmerDelta }))
		],
		note: `底分 ${input.base} × ${input.multiplier}，${input.landlordWon ? '地主' : '农民'}胜`
	};
}

export const doudizhu: Template<{ kind: 'doudizhu' }> = {
	id: 'doudizhu',
	names: { zh: '斗地主', en: 'Dou Dizhu' },
	minPlayers: 3,
	maxPlayers: 3,
	defaultVariant: { kind: 'doudizhu' }
};
