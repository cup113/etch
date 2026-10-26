// 语言状态与 t()。$state 读值发生在组件模板里 → 切语言即全站重渲。
// 语言偏好持久化在 settings store（'lang'）。

import { dict, type DictKey, type Lang } from './dict';
import { getSetting, setSetting } from '../etch/db';

const i18n = $state<{ lang: Lang; loaded: boolean }>({ lang: 'zh', loaded: false });

export function currentLang(): Lang {
	return i18n.lang;
}

export function i18nReady(): boolean {
	return i18n.loaded;
}

/** 启动时读取偏好；无偏好时跟随浏览器语言。由根布局调用（浏览器端）。 */
export async function initI18n(): Promise<void> {
	if (i18n.loaded) return;
	const saved = await getSetting<Lang>('lang');
	if (saved === 'zh' || saved === 'en') {
		i18n.lang = saved;
	} else if (
		typeof navigator !== 'undefined' &&
		!navigator.language.toLowerCase().startsWith('zh')
	) {
		i18n.lang = 'en';
	}
	i18n.loaded = true;
}

export async function setLang(lang: Lang): Promise<void> {
	i18n.lang = lang;
	await setSetting('lang', lang);
}

/** t('playersCount', { n: 3 }) → "3 人"。 */
export function t(key: DictKey, params?: Record<string, string | number>): string {
	let text: string = dict[key][i18n.lang];
	if (params) {
		for (const [k, v] of Object.entries(params)) {
			text = text.replaceAll(`{${k}}`, String(v));
		}
	}
	return text;
}
