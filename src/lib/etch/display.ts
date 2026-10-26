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

export const tplNameKey: Record<TemplateId, DictKey> = {
	generic: 'tplGeneric',
	doudizhu: 'tplDoudizhu',
	uno: 'tplUno',
	guandan: 'tplGuandan'
};

export const tplDescKey: Record<TemplateId, DictKey> = {
	generic: 'tplGenericDesc',
	doudizhu: 'tplDoudizhuDesc',
	uno: 'tplUnoDesc',
	guandan: 'tplGuandanDesc'
};
