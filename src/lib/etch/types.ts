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
	/** 结构化参数快照（双升：庄家/得分/回退/预指定；掼蛋：出完顺序；其余模板缺省） */
	meta?: EntryMeta;
	/** 增减行；凿除笔为空数组 */
	lines: Line[];
}

/** 玩家入碑时的名字快照，与花名册解耦 */
export interface PlayerRef {
	id: PlayerId;
	name: string;
}

export type TemplateId = 'generic' | 'doudizhu' | 'uno' | 'guandan' | 'cabo' | 'shuangsheng';

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

/** 掼蛋：头游+二游（双下）与头游+三游（单下）的进级数都可配；头游+末游恒 1 级。
 *  levelsPerSingleDown 可缺省 = 旧碑（恒 1）回落；levelsPerDoubleDown 类型容忍旧值 1。 */
export interface GuandanVariant {
	kind: 'guandan';
	levelsPerDoubleDown: 1 | 2 | 3;
	/** 旧碑无此字段；缺省按 1（升级前"普通胜恒 1 级"的行为） */
	levelsPerSingleDown?: 1 | 2;
}

/** 双升：下一局庄家怎么定。rotate = 轮庄；reveal = 亮牌后每局选；designate = 开局前指定 */
export type ShuangshengDeclarerFlow = 'rotate' | 'reveal' | 'designate';

/** 双升：必打级。none = 都不必打；A = A 必打；JA = J、A 必打 */
export type ShuangshengMustPlay = 'none' | 'A' | 'JA';

/** 双升：闲家得分 → 升级数的换算参数（换算表见 templates/shuangsheng.ts）。 */
export interface ShuangshengVariant {
	kind: 'shuangsheng';
	/** 80 分（上台）时闲家升几级：0 = 只换庄不升级；1 = 上台占一级，整条闲家阶梯随之平移 */
	levelsAt80: 0 | 1;
	/** 闲家升数换算的封顶档：160 / 200 / 0（0 = 不封顶） */
	defenderCapScore: 160 | 200 | 0;
	/** 大光奖励：0 分时庄家升 4 而非 3 */
	grandWinBonus: boolean;
	/** 允许倒级（抠底回退的罕见房规）：开启后刻入表单出现可选回退区 */
	allowRollback: boolean;
	/** 首庄队伍（座位 0-2 = 队 0，1-3 = 队 1）；旧碑只有队，新碑可由 firstDeclarer 推出 */
	firstDeclarerTeam: 0 | 1;
	/** 首庄（可选）：第一局坐庄的人；缺省 = 旧碑，只知队 */
	firstDeclarer?: PlayerId;
	/** 下一局庄家规则；缺省 = rotate（旧碑按轮庄） */
	declarerFlow?: ShuangshengDeclarerFlow;
	/** 必打级：none / A / JA；缺省 = none（旧碑兼容） */
	mustPlay?: ShuangshengMustPlay;
}

/** CABO：触线终局（到 threshold 宣告最低分者胜），门槛默认 100。 */
export interface CaboVariant {
	kind: 'cabo';
	threshold: number;
}

export type Variant =
	GenericVariant | DoudizhuVariant | UnoVariant | GuandanVariant | ShuangshengVariant | CaboVariant;

/** 双升笔的结构化参数快照：庄家追踪、预指定与回退差值的重放依据（碑的折叠只用 lines）。 */
export interface ShuangshengEntryMeta {
	/** 新笔写入；旧笔没有，读时按双升处理 */
	kind?: 'shuangsheng';
	/** 本笔的庄家队（旧笔必有；新笔由 declarer 的座位推出） */
	declarerTeam: 0 | 1;
	/** 本笔坐庄的人；旧笔没有，只能按队推导 */
	declarer?: PlayerId;
	/** 闲家得分（0–200） */
	defendersScore: number;
	/** 预指定：下一局坐庄的人（仅“指定”模式写入） */
	nextDeclarer?: PlayerId;
	/** 回退（可选）：哪队被抠底 */
	rollbackTeam?: 0 | 1;
	/** 回退（可选）：回到第几级（0 = 打 2 … 12 = 打 A，绝对目标） */
	rollbackToLevel?: number;
}

/** 掼蛋笔的结构化参数快照：出完顺序（头游/二游/三游/末游），进级与进贡的重放依据。 */
export interface GuandanEntryMeta {
	kind: 'guandan';
	finish: [PlayerId, PlayerId, PlayerId, PlayerId];
}

/** 笔的结构化快照：按碑的模板区分；双升旧笔无 kind，缺省按双升读。 */
export type EntryMeta = ShuangshengEntryMeta | GuandanEntryMeta;

/** 碑：一局牌的完整账本 */
export interface Game {
	id: string;
	createdAt: number;
	/** 碑名（可选）：开碑时可写、之后可在碑务里改名；缺省显示模板名 */
	name?: string;
	templateId: TemplateId;
	variant: Variant;
	/** 座位序；掼蛋 / 双升按 0-2 / 1-3 成队 */
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
	| { kind: 'level-capped'; playerId: PlayerId }
	| { kind: 'cabo-finished'; playerId: PlayerId; threshold: number };
