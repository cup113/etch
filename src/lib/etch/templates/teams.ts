// 座位成队：掼蛋 / 双升共用。座位 i 与 i+2 同队（0-2 一队、1-3 一队）。

export function teamOfSeat(seat: number): 0 | 1 {
	return seat % 2 === 0 ? 0 : 1;
}
