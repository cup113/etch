// 导入校验：账本不变量 + 模板级 meta / 变体校验。
// 只在导入拓片时调用；appendEntry 不依赖模板，避免 ledger 反向依赖 templates。

import { LedgerError, validateGame } from '../ledger';
import type { Game, GuandanEntryMeta, ShuangshengEntryMeta, ShuangshengVariant } from '../types';
import { teamOfSeat } from './teams';

export function validateTablet(game: Game): void {
	validateGame(game);
	if (game.variant.kind === 'shuangsheng') validateShuangsheng(game, game.variant);
	else if (game.variant.kind === 'guandan') validateGuandan(game);
	// 其余模板不用 meta：未知的新增字段一律忽略（前向兼容）
}

function seatOf(game: Game, playerId: string): number {
	return game.players.findIndex((p) => p.id === playerId);
}

function bad(entrySeq: number, message: string): never {
	throw new LedgerError('bad-entry-meta', `entry seq=${entrySeq}: ${message}`);
}

function validateShuangsheng(game: Game, variant: ShuangshengVariant): void {
	if (variant.firstDeclarerTeam !== 0 && variant.firstDeclarerTeam !== 1) {
		throw new LedgerError('bad-entry-meta', 'firstDeclarerTeam 必须是 0 或 1');
	}
	if (variant.firstDeclarer !== undefined) {
		const seat = seatOf(game, variant.firstDeclarer);
		if (seat < 0) throw new LedgerError('bad-entry-meta', 'first declarer 不在碑上');
		if (teamOfSeat(seat) !== variant.firstDeclarerTeam) {
			throw new LedgerError('bad-entry-meta', 'first declarer 与 firstDeclarerTeam 不一致');
		}
	}

	for (const entry of game.entries) {
		const meta = entry.meta;
		if (!meta) continue;
		if (entry.kind === 'chisel') bad(entry.seq, '凿除笔不能带 meta');
		if (meta.kind === 'guandan') bad(entry.seq, '双升碑上出现了掼蛋 meta');
		const m = meta as ShuangshengEntryMeta;
		if (m.declarerTeam !== 0 && m.declarerTeam !== 1) {
			bad(entry.seq, 'declarerTeam 必须是 0 或 1');
		}
		if (!Number.isInteger(m.defendersScore) || m.defendersScore < 0 || m.defendersScore > 200) {
			bad(entry.seq, '闲家得分必须是 0–200 的整数');
		}
		if (m.declarer !== undefined) {
			const seat = seatOf(game, m.declarer);
			if (seat < 0) bad(entry.seq, '本局庄家不在碑上');
			if (teamOfSeat(seat) !== m.declarerTeam) bad(entry.seq, '本局庄家与庄家队不一致');
		}
		if (m.nextDeclarer !== undefined && seatOf(game, m.nextDeclarer) < 0) {
			bad(entry.seq, '下局庄家不在碑上');
		}
		const hasTeam = m.rollbackTeam !== undefined;
		const hasLevel = m.rollbackToLevel !== undefined;
		if (hasTeam !== hasLevel) bad(entry.seq, '回退的队与目标级必须同时出现');
		if (hasTeam && m.rollbackTeam !== 0 && m.rollbackTeam !== 1) {
			bad(entry.seq, '回退队必须是 0 或 1');
		}
		if (
			hasLevel &&
			(!Number.isInteger(m.rollbackToLevel) ||
				(m.rollbackToLevel as number) < 0 ||
				(m.rollbackToLevel as number) >= 13)
		) {
			bad(entry.seq, '回退目标级应在 2..A 之间');
		}
	}
}

function validateGuandan(game: Game): void {
	for (const entry of game.entries) {
		const meta = entry.meta;
		if (!meta) continue;
		if (entry.kind === 'chisel') bad(entry.seq, '凿除笔不能带 meta');
		if (meta.kind !== 'guandan') bad(entry.seq, '掼蛋碑上出现了非掼蛋 meta');
		const { finish } = meta as GuandanEntryMeta;
		if (!Array.isArray(finish) || finish.length !== 4) {
			bad(entry.seq, '出完顺序必须有 4 人');
		}
		const seats = finish.map((id) => seatOf(game, id));
		if (seats.some((seat) => seat < 0)) bad(entry.seq, '出完顺序里有不在碑上的玩家');
		if (new Set(seats).size !== 4) bad(entry.seq, '出完顺序不能重复');
	}
}
