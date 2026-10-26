<script lang="ts">
	// 首页：新碑入口（四张模板卡）+ 碑林（历史）+ 拓片导入 + 设置。
	import { resolve } from '$app/paths';
	import { etchState, importRubbing } from '../lib/etch/store.svelte';
	import { unrub } from '../lib/etch/rubbing';
	import { formatDate, tplDescKey, tplNameKey } from '../lib/etch/display';
	import type { TemplateId } from '../lib/etch/types';
	import { t, currentLang } from '../lib/i18n/i18n.svelte';
	import SettingsSheet from '../lib/components/SettingsSheet.svelte';

	const templateIds: TemplateId[] = ['generic', 'doudizhu', 'uno', 'guandan'];

	let showSettings = $state(false);
	let importMsg = $state<string | null>(null);
	let importErr = $state<string | null>(null);

	async function onImport(file: File): Promise<void> {
		importMsg = null;
		importErr = null;
		try {
			const game = unrub(await file.text());
			await importRubbing(game);
			importMsg = t('importOk');
		} catch (err) {
			importErr = t('importFail', {
				reason: err instanceof Error ? err.message : String(err)
			});
		}
	}
</script>

<header class="mb-8 flex items-start justify-between">
	<div>
		<h1 class="text-4xl font-black tracking-tight text-stone-950" data-testid="brand">Etch</h1>
		<p class="mt-1 text-sm font-medium text-stone-500">{t('subtitle')}</p>
	</div>
	<button
		type="button"
		class="rounded-md border border-stone-400 px-3 py-2 text-sm font-bold text-stone-800"
		onclick={() => (showSettings = true)}
		data-testid="open-settings"
		aria-label={t('settings')}
	>
		⚙
	</button>
</header>

<section aria-labelledby="new-tablet">
	<h2 id="new-tablet" class="mb-2 text-xs font-bold tracking-widest text-stone-500 uppercase">
		{t('newTablet')}
	</h2>
	<div class="grid grid-cols-2 gap-3">
		{#each templateIds as id (id)}
			<a
				href={resolve('/new/[templateId]', { templateId: id })}
				class="rounded-lg border border-stone-300 bg-stone-50 p-4 active:bg-stone-200"
				data-testid="tpl-card-{id}"
			>
				<div class="text-lg font-black text-stone-950">{t(tplNameKey[id])}</div>
				<div class="mt-1 text-xs leading-relaxed text-stone-500">{t(tplDescKey[id])}</div>
			</a>
		{/each}
	</div>
</section>

<section class="mt-8" aria-labelledby="history">
	<div class="mb-2 flex items-center justify-between">
		<h2 id="history" class="text-xs font-bold tracking-widest text-stone-500 uppercase">
			{t('history')}
		</h2>
		<label
			class="cursor-pointer rounded-md border border-stone-400 px-3 py-1.5 text-xs font-bold text-stone-800"
			data-testid="import-rubbing"
		>
			{t('importRubbing')}
			<input
				type="file"
				accept="application/json,.json"
				class="hidden"
				onchange={(e) => {
					const file = e.currentTarget.files?.[0];
					if (file) void onImport(file);
					e.currentTarget.value = '';
				}}
			/>
		</label>
	</div>

	{#if importMsg}
		<p class="mb-2 text-sm font-semibold text-stone-800" data-testid="import-ok">{importMsg}</p>
	{/if}
	{#if importErr}
		<p class="mb-2 text-sm font-semibold text-stone-700" data-testid="import-fail">{importErr}</p>
	{/if}

	{#if etchState.games.length === 0}
		<p
			class="rounded-lg border border-dashed border-stone-300 p-4 text-sm text-stone-500"
			data-testid="history-empty"
		>
			{t('emptyHistory')}
		</p>
	{:else}
		<ul class="space-y-2">
			{#each etchState.games as g (g.id)}
				<li>
					<a
						href={resolve('/game/[id]', { id: g.id })}
						class="flex items-center justify-between rounded-lg border border-stone-300 bg-stone-50 px-4 py-3 active:bg-stone-200"
						data-testid="game-card-{g.id}"
					>
						<div>
							<div class="font-bold text-stone-950">{t(tplNameKey[g.templateId])}</div>
							<div class="mt-0.5 text-xs text-stone-500 tabular">
								{formatDate(g.createdAt, currentLang())} ·
								{t('playersCount', { n: g.players.length })} ·
								{t('entriesCount', { n: g.entries.filter((e) => e.kind !== 'chisel').length })}
							</div>
						</div>
						<span class="text-stone-400">›</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>

{#if showSettings}
	<SettingsSheet onclose={() => (showSettings = false)} />
{/if}
