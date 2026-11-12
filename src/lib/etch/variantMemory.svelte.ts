// 上次用过的变体：各模板各记一份，下次开同模板的石板时预填（CONTEXT 的"变体"）。
// 这不是设置 —— 没有开关也没有界面，开刻时顺手写回，和触感一样落在 settings 表里。
//
// 只属于某一块石板的参数不沿用：首庄是人，座位又随玩家顺序变，所以 ssFirstDeclarer /
// firstDeclarerTeam 读回来一律不看（见 new/[templateId]/+page.svelte）。

import { getSetting, setSetting } from './db';
import type { TemplateId, Variant } from './types';

const KEY = 'lastVariants';

type Memory = Partial<Record<Variant['kind'], Variant>>;

const memory = $state<{ loaded: boolean; byTemplate: Memory }>({ loaded: false, byTemplate: {} });

export async function initVariantMemory(): Promise<void> {
	if (memory.loaded) return;
	const saved = await getSetting<Memory>(KEY);
	memory.byTemplate = saved && typeof saved === 'object' ? saved : {};
	memory.loaded = true;
}

/** 开刻页要同步读上次的变体，所以布局在渲染子页之前等这个为 true。 */
export function variantMemoryReady(): boolean {
	return memory.loaded;
}

/** 该模板上次用的变体；从没开过就 null。字段可能是旧版本存的，调用方要自己兜底。 */
export function rememberedVariant(id: TemplateId): Variant | null {
	return memory.byTemplate[id] ?? null;
}

/** 开刻时写回：下次同模板沿用。存的是整份变体，读的一方自己挑字段。 */
export async function rememberVariant(variant: Variant): Promise<void> {
	memory.byTemplate = { ...memory.byTemplate, [variant.kind]: variant };
	await setSetting(KEY, $state.snapshot(memory.byTemplate));
}
