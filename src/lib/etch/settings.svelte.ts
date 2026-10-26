// 触感设置与振动封装。iOS Safari 不支持 navigator.vibrate —— 静默降级。

import { getSetting, setSetting } from './db';

const settings = $state({ haptics: true, loaded: false });

export async function initSettings(): Promise<void> {
	if (settings.loaded) return;
	const saved = await getSetting<boolean>('haptics');
	if (saved !== null) settings.haptics = saved;
	settings.loaded = true;
}

export async function setHaptics(on: boolean): Promise<void> {
	settings.haptics = on;
	await setSetting('haptics', on);
}

export function hapticsEnabled(): boolean {
	return settings.haptics;
}

/** 刻入时的短促触感（约 8ms）。 */
export function haptic(ms = 8): void {
	if (!settings.haptics) return;
	if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
		navigator.vibrate(ms);
	}
}
