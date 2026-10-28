// 应用状态与动作：碑、花名册、设置。runes 模块（.svelte.ts），$effect 只存在于组件里。
// 不变量：先落 IDB、再发布到内存状态 —— 因此"界面上看到的分数"永远已经写入磁盘，
// 刷新/关页面不会丢（ADR-0002 的"永不消失"承诺在 UI 层的兑现方式）。

import { deleteGame, loadGames, loadRoster, putGame, putPlayer } from './db';
import { appendEntry, chisel as chiselEntry, fold, newGame, newId } from './ledger';
import type { RoundResult } from './templates';
import type { EntryKind, Game, Player, PlayerId, PlayerRef, TemplateId, Variant } from './types';

export interface EtchState {
	ready: boolean;
	/** IDB 不可用：本次会话的数据不持久（"临时碑"横幅） */
	memoryOnly: boolean;
	games: Game[];
	roster: Player[];
}

export const etchState = $state<EtchState>({
	ready: false,
	memoryOnly: false,
	games: [],
	roster: []
});

/**
 * 先写盘，成功后才让 UI 可见。
 *
 * 必须先 $state.snapshot：etchState 里的值是 Svelte 的深层响应式 Proxy，
 * 而 IndexedDB 的 structured clone 拒绝克隆 Proxy（DataCloneError）。
 * 快照同时保证了落盘的是普通数据、而非活的响应式引用。
 */
async function persistGame(game: Game): Promise<void> {
	const plain = $state.snapshot(game) as Game;
	await putGame(plain);
	// 已存在的碑（改名、导入覆盖）原位替换：碑林按 createdAt 排序，不该被一次编辑顶到首位。
	// 新碑（含导入的新拓片）按同一排序插入，与 loadGames 的结果保持一致。
	if (etchState.games.some((g) => g.id === plain.id)) {
		etchState.games = etchState.games.map((g) => (g.id === plain.id ? plain : g));
	} else {
		etchState.games = [...etchState.games, plain].sort((a, b) => b.createdAt - a.createdAt);
	}
}

export async function initEtch(): Promise<void> {
	if (etchState.ready) return;
	const [games, roster] = await Promise.all([loadGames(), loadRoster()]);
	if (games === null || roster === null) {
		etchState.memoryOnly = true;
	} else {
		etchState.games = games;
		etchState.roster = roster;
	}
	etchState.ready = true;
}

// ---- 碑 ----

export async function createTablet(
	templateId: TemplateId,
	variant: Variant,
	players: PlayerRef[],
	name?: string
): Promise<Game> {
	const game = newGame({ templateId, variant, players, name });
	await persistGame(game);
	return game;
}

/** 改名：只是碑的元数据，不触碰追加式账本（笔与折叠都不动）。空白 = 回到无名碑。 */
export async function renameTablet(gameId: string, name: string): Promise<void> {
	const game = etchState.games.find((g) => g.id === gameId);
	if (!game) throw new Error(`no tablet ${gameId}`);
	const trimmed = name.trim();
	const next: Game = { ...game };
	if (trimmed) next.name = trimmed;
	else delete next.name;
	await persistGame(next);
}

/** 刻：把一局结果（或手工行）追加为一笔。校验失败抛 LedgerError，碑不动。 */
export async function etch(
	gameId: string,
	round: RoundResult,
	kind: EntryKind = 'template'
): Promise<Game> {
	const game = etchState.games.find((g) => g.id === gameId);
	if (!game) throw new Error(`no tablet ${gameId}`);
	const next = appendEntry(game, {
		id: newId(),
		seq: game.entries.length + 1,
		ts: Date.now(),
		kind,
		lines: round.lines,
		note: round.note,
		meta: round.meta
	});
	await persistGame(next);
	return next;
}

/** 凿除一笔（整笔冲正）。 */
export async function chisel(gameId: string, entryId: string): Promise<Game> {
	const game = etchState.games.find((g) => g.id === gameId);
	if (!game) throw new Error(`no tablet ${gameId}`);
	const next = chiselEntry(game, entryId);
	await persistGame(next);
	return next;
}

/** 磨碑：唯一销毁操作（CONTEXT.md）。拓片不受影响。 */
export async function eraseTablet(gameId: string): Promise<void> {
	await deleteGame(gameId);
	etchState.games = etchState.games.filter((g) => g.id !== gameId);
}

/** 导入拓片：同 id 覆盖（同碑恢复），否则成为新碑。 */
export async function importRubbing(game: Game): Promise<void> {
	await persistGame(game);
}

// ---- 花名册 ----

function matchKey(name: string): string {
	return name.trim().toLowerCase();
}

/** combobox 背后：名字已知名册则复用，否则显式新建并入册。 */
export async function addOrReusePlayer(name: string): Promise<Player> {
	const key = matchKey(name);
	if (!key) throw new Error('名字不能为空');
	const known = etchState.roster.find((p) => matchKey(p.name) === key);
	if (known) return known;
	const player: Player = { id: newId(), name: name.trim() };
	await putPlayer(player);
	etchState.roster = [...etchState.roster, player].sort((a, b) =>
		a.name.localeCompare(b.name, 'zh')
	);
	return player;
}

// ---- 派生 ----

export function totalsOf(game: Game): Record<PlayerId, number> {
	return fold(game);
}
