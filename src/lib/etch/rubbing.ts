// 拓片：一块碑的版本化 JSON 导出/导入（ADR-0002：跨设备的唯一通道）。
// 版本策略：纯增量变更（新模板 id、Entry 可选字段）不升版本——旧拓片永远可读，
// 旧版本 App 读到不认识的模板会被它自己的白名单拒绝（它本来也不会算那个模板）。

import type { Game } from './types';
import { validateGame } from './ledger';

export const RUBBING_VERSION = 1;

export interface Rubbing {
	etch: typeof RUBBING_VERSION;
	kind: 'rubbing';
	game: Game;
}

export class RubbingError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'RubbingError';
	}
}

export function rub(game: Game): string {
	const rubbing: Rubbing = { etch: RUBBING_VERSION, kind: 'rubbing', game };
	return JSON.stringify(rubbing, null, 2);
}

export function unrub(text: string): Game {
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new RubbingError('不是合法的 JSON');
	}
	if (typeof parsed !== 'object' || parsed === null) {
		throw new RubbingError('拓片格式不对');
	}
	const r = parsed as Partial<Rubbing>;
	if (r.kind !== 'rubbing' || typeof r.game !== 'object' || r.game === null) {
		throw new RubbingError('这不是一块 Etch 拓片');
	}
	if (r.etch !== RUBBING_VERSION) {
		throw new RubbingError(`拓片版本不支持：${String(r.etch)}（本机支持 ${RUBBING_VERSION}）`);
	}
	const g = r.game;
	if (
		typeof g.id !== 'string' ||
		typeof g.createdAt !== 'number' ||
		!['generic', 'doudizhu', 'uno', 'guandan', 'cabo', 'shuangsheng'].includes(g.templateId) ||
		!Array.isArray(g.players) ||
		g.players.length === 0 ||
		!Array.isArray(g.entries)
	) {
		throw new RubbingError('碑面数据不完整');
	}
	try {
		validateGame(g);
	} catch (err) {
		const reason = err instanceof Error ? err.message : String(err);
		throw new RubbingError(`碑面数据校验失败：${reason}`);
	}
	return g;
}
