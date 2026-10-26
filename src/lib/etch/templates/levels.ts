// 级牌阶梯：掼蛋与双升共用。级数 0 显示 '2'，12 = 'A'；过 A = 级数 ≥ 13。
// 倒级（回退）在真实玩法中倒到 2 为止——负级数显示钳到 '2'，原始账仍保留负值。

export const LEVEL_NAMES = [
	'2',
	'3',
	'4',
	'5',
	'6',
	'7',
	'8',
	'9',
	'10',
	'J',
	'Q',
	'K',
	'A'
] as const;
export const LEVEL_CAP = LEVEL_NAMES.length; // 13

export function levelName(level: number): string {
	if (level < 0) return LEVEL_NAMES[0];
	return level >= LEVEL_CAP ? '过A' : (LEVEL_NAMES[level] ?? '?');
}
