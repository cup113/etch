// 账本：折叠、追加与凿除的全部不变量（ADR-0001：追加式刻痕账本）。
// 本模块是纯函数，零 Svelte / DOM 依赖，供 node 单测直接覆盖。

import type { Entry, EntryId, Game, Line, PlayerId } from './types';

export type LedgerErrorCode =
	| 'seq-must-be-next'
	| 'duplicate-entry-id'
	| 'unknown-player'
	| 'manual-entry-needs-lines'
	| 'chisel-must-have-no-lines'
	| 'chisel-target-missing'
	| 'chisel-target-already-chiseled'
	| 'chisel-of-chisel';

export class LedgerError extends Error {
	constructor(
		readonly code: LedgerErrorCode,
		message?: string
	) {
		super(message ?? code);
		this.name = 'LedgerError';
	}
}

export function newId(): string {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
	// 回退：极端环境（无 Web Crypto 的旧浏览器）；正常路径不会走到
	return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 下一笔的序号：append-only 下恒为 entries.length + 1 */
export function nextSeq(game: Game): number {
	return game.entries.length + 1;
}

function validateAppend(game: Game, entry: Entry): void {
	if (entry.id && game.entries.some((e) => e.id === entry.id)) {
		throw new LedgerError('duplicate-entry-id', `entry ${entry.id} already on the tablet`);
	}
	if (entry.seq !== nextSeq(game)) {
		throw new LedgerError('seq-must-be-next', `seq ${entry.seq} != next ${nextSeq(game)}`);
	}
	const known = new Set(game.players.map((p) => p.id));
	for (const line of entry.lines) {
		if (!known.has(line.playerId)) {
			throw new LedgerError('unknown-player', `player ${line.playerId} is not on this tablet`);
		}
	}
	if (entry.kind === 'chisel') {
		if (entry.lines.length > 0) throw new LedgerError('chisel-must-have-no-lines');
		const target = game.entries.find((e) => e.id === entry.chisels);
		if (!target) throw new LedgerError('chisel-target-missing', `no entry ${entry.chisels}`);
		if (target.kind === 'chisel') {
			throw new LedgerError(
				'chisel-of-chisel',
				'a chisel cannot be chiseled; etch a new entry instead'
			);
		}
		if (isChiseled(game, target.id)) {
			throw new LedgerError(
				'chisel-target-already-chiseled',
				`entry ${target.id} is already chiseled`
			);
		}
	} else if (entry.lines.length === 0) {
		throw new LedgerError('manual-entry-needs-lines', 'a non-chisel entry needs at least one line');
	}
}

/** 纯追加：校验通过则返回带新笔的碑，否则抛 LedgerError，原碑不动。 */
export function appendEntry(game: Game, entry: Entry): Game {
	validateAppend(game, entry);
	return { ...game, entries: [...game.entries, entry] };
}

/** 凿除：生成指向 target 的冲正笔并追加。冲正的冲正 = 重新刻一笔原内容。 */
export function chisel(game: Game, targetId: EntryId, ts = Date.now()): Game {
	const chiselEntry: Entry = {
		id: newId(),
		seq: nextSeq(game),
		ts,
		kind: 'chisel',
		chisels: targetId,
		lines: []
	};
	return appendEntry(game, chiselEntry);
}

export function isChiseled(game: Game, entryId: EntryId): boolean {
	return game.entries.some((e) => e.kind === 'chisel' && e.chisels === entryId);
}

/** 折叠：对全部未被凿除的笔求和。 */
export function fold(game: Game): Record<PlayerId, number> {
	const totals: Record<PlayerId, number> = {};
	for (const p of game.players) totals[p.id] = 0;
	for (const e of game.entries) {
		if (e.kind === 'chisel' || isChiseled(game, e.id)) continue;
		for (const line of e.lines) {
			// 玩家固定，lines 已在追加时校验过归属
			totals[line.playerId] = (totals[line.playerId] ?? 0) + line.delta;
		}
	}
	return totals;
}

/** 回合号：非凿除笔在未被凿除笔中的序位（第几刻），凿除笔继承其目标的回合号。 */
export function roundOf(game: Game, entry: Entry): number {
	if (entry.kind === 'chisel') {
		const target = game.entries.find((e) => e.id === entry.chisels);
		return target ? roundOf(game, target) : 0;
	}
	let round = 0;
	for (const e of game.entries) {
		if (e.kind === 'chisel') continue;
		round += 1;
		if (e.id === entry.id) return round;
	}
	return 0;
}

/** 校验一整块碑（导入拓片用）：从骨架重放每一笔。坏数据抛 LedgerError。 */
export function validateGame(game: Game): void {
	let replay: Game = { ...game, entries: [] };
	for (const entry of game.entries) {
		try {
			replay = appendEntry(replay, entry);
		} catch (err) {
			if (err instanceof LedgerError) {
				throw new LedgerError(err.code, `entry seq=${entry.seq}: ${err.message}`);
			}
			throw err;
		}
	}
}

/** 造一块新碑（开局）。players 至少一名。 */
export function newGame(input: {
	templateId: Game['templateId'];
	variant: Game['variant'];
	players: { id: PlayerId; name: string }[];
}): Game {
	if (input.players.length === 0) throw new Error('a tablet needs players');
	return {
		id: newId(),
		createdAt: Date.now(),
		templateId: input.templateId,
		variant: input.variant,
		players: input.players.map((p) => ({ ...p })),
		entries: []
	};
}

/** 便于手写测试数据：造一笔 */
export function manualEntry(seq: number, lines: Line[], ts = Date.now()): Entry {
	return { id: newId(), seq, ts, kind: 'manual', lines };
}
