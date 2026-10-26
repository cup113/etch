// Etch 领域类型 —— 术语见 /CONTEXT.md。
// 笔（Entry）不可变；碑（Game）是账本；凿除（Chisel）是冲正笔。

export type PlayerId = string;
export type EntryId = string;

/** 一行增减：某玩家在本笔中的增减量 */
export interface Line {
	playerId: PlayerId;
	delta: number;
}

export type EntryKind = 'manual' | 'template' | 'chisel';

/** 笔：一次不可分割的"刻"。追加后不可改、不可删（ADR-0001）。 */
export interface Entry {
	id: EntryId;
	/** 碑内序号，从 1 起、连续递增（恒等于追加时的位置 + 1） */
	seq: number;
	/** epoch 毫秒 */
	ts: number;
	kind: EntryKind;
	/** 参数快照，如 "底分 20 × 倍数 4，地主胜"；凿除笔无 */
	note?: string;
	/** 仅凿除笔：指向被凿的笔 */
	chisels?: EntryId;
	/** 增减行；凿除笔为空数组 */
	lines: Line[];
}

/** 玩家入碑时的名字快照，与花名册解耦 */
export interface PlayerRef {
	id: PlayerId;
	name: string;
}

export type TemplateId = 'generic' | 'doudizhu' | 'uno' | 'guandan';

/** 通用：纯手工账，无变体参数 */
export interface GenericVariant {
	kind: 'generic';
}

/** 斗地主：v1 无变体参数（底分×倍数随每笔输入） */
export interface DoudizhuVariant {
	kind: 'doudizhu';
}

/** UNO：计分方向由 mode 决定 —— race 升（赢家收点，先到 threshold 胜）；elimination 降（各吃各的剩牌分，谁先 ≥threshold 出局） */
export interface UnoVariant {
	kind: 'uno';
	mode: 'race' | 'elimination';
	/** race：目标分（默认 500）；elimination：出局线（默认 300） */
	threshold: number;
}

/** 掼蛋：双下时的进级数（普通胜恒进 1 级） */
export interface GuandanVariant {
	kind: 'guandan';
	levelsPerDoubleDown: 1 | 2 | 3;
}

export type Variant = GenericVariant | DoudizhuVariant | UnoVariant | GuandanVariant;

/** 碑：一局牌的完整账本 */
export interface Game {
	id: string;
	createdAt: number;
	/** 磨碑时间；未磨则缺省 */
	erasedAt?: number;
	templateId: TemplateId;
	variant: Variant;
	/** 座位序；掼蛋按 0-2 / 1-3 成队 */
	players: PlayerRef[];
	entries: Entry[];
}

/** 花名册玩家：只有名字，没有属性 */
export interface Player {
	id: PlayerId;
	name: string;
}

/** 宣告：结构化事件，文案由 UI 按 i18n 渲染。碑不执法——宣告不改变任何行为。 */
export type Proclamation =
	| { kind: 'race-won'; playerId: PlayerId; threshold: number }
	| { kind: 'eliminated'; playerId: PlayerId; threshold: number }
	| { kind: 'last-standing'; playerId: PlayerId; threshold: number }
	| { kind: 'level-capped'; playerId: PlayerId };
