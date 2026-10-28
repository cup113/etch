// 显示辅助：名字解析、日期格式化。UI 专用，不进领域核心。

import type { DictKey } from '../i18n/dict';
import type { Game, PlayerId, TemplateId } from './types';

export function nameOf(game: Game, id: PlayerId): string {
	return game.players.find((p) => p.id === id)?.name ?? '?';
}

export function formatDate(ts: number, lang: 'zh' | 'en'): string {
	return new Date(ts).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
		month: 'short',
		day: 'numeric'
	});
}

export function signed(n: number): string {
	return n > 0 ? `+${n}` : String(n);
}

/** 拓片下载文件名：碑名净化后作前缀（去路径分隔符/空白），无名碑回落到 日期 + id 前缀。 */
export function rubbingFileName(game: Game, lang: 'zh' | 'en'): string {
	const stem = (game.name ?? '').replace(/[\\/:*?"<>|\s]+/g, '').slice(0, 30);
	const date = formatDate(game.createdAt, lang).replaceAll(' ', '');
	return ['etch', stem, date, game.id.slice(0, 8)].filter(Boolean).join('-') + '.json';
}

export const tplNameKey: Record<TemplateId, DictKey> = {
	generic: 'tplGeneric',
	doudizhu: 'tplDoudizhu',
	uno: 'tplUno',
	guandan: 'tplGuandan',
	cabo: 'tplCabo',
	shuangsheng: 'tplShuangsheng'
};
