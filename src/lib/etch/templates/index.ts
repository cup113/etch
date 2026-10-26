// 模板注册表与模板契约。模板 = 规则形状 + 变体参数（CONTEXT.md），不是规则引擎：
// 每个模板只提供"一局结果 → 笔的行"的计算函数与终局检测，碑不执法。

import type { Game, PlayerId, Proclamation, TemplateId, Variant } from '../types';
import { generic } from './generic';
import { doudizhu } from './doudizhu';
import { uno } from './uno';
import { guandan } from './guandan';

/** 模板一局的输入：摊好的增减行 + 参数快照文本 */
export interface RoundResult {
	lines: { playerId: PlayerId; delta: number }[];
	note?: string;
}

export interface Template<V extends Variant = Variant> {
	id: TemplateId;
	names: { zh: string; en: string };
	minPlayers: number;
	maxPlayers: number;
	/** 掼蛋：座位 0-2 / 1-3 成队 */
	teams?: 'alternating-pairs';
	defaultVariant: V;
	/** 终局检测 → 宣告；无终局概念的模板缺省 */
	detect?: (game: Game) => Proclamation[];
}

export const templates: Record<TemplateId, Template> = {
	generic: generic as Template,
	doudizhu: doudizhu as Template,
	uno: uno as Template,
	guandan: guandan as Template
};

export function templateOf(id: TemplateId): Template {
	const t = templates[id];
	if (!t) throw new Error(`unknown template: ${id}`);
	return t;
}

export { generic, doudizhu, uno, guandan };
