<script lang="ts">
	// 碑面：总分（刻入动效）→ 宣告 → 刻入面板 → 刻痕流（凿除）。碑务菜单：拓片导出 / 磨碑。
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import {
		chisel as chiselAction,
		etch as etchAction,
		eraseTablet,
		etchState
	} from '../../../lib/etch/store.svelte';
	import { rub } from '../../../lib/etch/rubbing';
	import { formatDate, tplNameKey } from '../../../lib/etch/display';
	import type { RoundResult } from '../../../lib/etch/templates';
	import { haptic } from '../../../lib/etch/settings.svelte';
	import { t, currentLang } from '../../../lib/i18n/i18n.svelte';
	import TotalsGrid from '../../../lib/components/TotalsGrid.svelte';
	import ProclamationBar from '../../../lib/components/ProclamationBar.svelte';
	import EtchPanel from '../../../lib/components/EtchPanel.svelte';
	import EntryList from '../../../lib/components/EntryList.svelte';

	const game = $derived(etchState.games.find((g) => g.id === page.params.id));

	let menuOpen = $state(false);
	let eraseConfirming = $state(false);

	async function onetch(round: RoundResult): Promise<void> {
		if (!game) return;
		await etchAction(game.id, round);
		haptic();
	}

	async function onchisel(entryId: string): Promise<void> {
		if (!game) return;
		await chiselAction(game.id, entryId);
		haptic(12);
	}

	function exportRubbing(): void {
		if (!game) return;
		const blob = new Blob([rub(game)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `etch-${formatDate(game.createdAt, currentLang()).replaceAll(' ', '')}-${game.id.slice(0, 8)}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	async function doErase(): Promise<void> {
		if (!game) return;
		await eraseTablet(game.id);
		await goto(resolve('/'));
	}
</script>

{#if game}
	<header class="mb-4 flex items-center justify-between">
		<div>
			<a href={resolve('/')} class="text-xs font-bold tracking-widest text-stone-500 uppercase"
				>‹ {t('back')}</a
			>
			<h1 class="mt-1 text-2xl font-black tracking-tight text-stone-950" data-testid="board-title">
				{t(tplNameKey[game.templateId])}
				<span class="ml-2 text-sm font-semibold text-stone-400 tabular">
					{formatDate(game.createdAt, currentLang())}
				</span>
			</h1>
		</div>
		<button
			type="button"
			class="rounded-md border border-stone-400 px-3 py-2 text-sm font-bold text-stone-800"
			onclick={() => (menuOpen = !menuOpen)}
			aria-label={t('tabletMenu')}
			data-testid="tablet-menu"
		>
			⋯
		</button>
	</header>

	{#if menuOpen}
		<div
			class="mb-4 rounded-lg border border-stone-300 bg-stone-50 p-4"
			data-testid="tablet-menu-panel"
		>
			<button
				type="button"
				class="block w-full etch-chip"
				onclick={exportRubbing}
				data-testid="export-rubbing"
			>
				{t('exportRubbing')}
			</button>
			{#if eraseConfirming}
				<p class="mt-3 text-sm font-medium text-stone-700" data-testid="erase-confirm-text">
					{t('eraseConfirm')}
				</p>
				<div class="mt-2 flex gap-2">
					<button
						type="button"
						class="etch-chip etch-chip-on"
						onclick={() => void doErase()}
						data-testid="erase-confirm-yes"
					>
						{t('eraseTablet')}
					</button>
					<button
						type="button"
						class="etch-chip"
						onclick={() => (eraseConfirming = false)}
						data-testid="erase-confirm-no"
					>
						{t('cancel')}
					</button>
				</div>
			{:else}
				<button
					type="button"
					class="mt-2 block w-full etch-chip text-stone-500"
					onclick={() => (eraseConfirming = true)}
					data-testid="erase-ask"
				>
					{t('eraseTablet')}
				</button>
			{/if}
		</div>
	{/if}

	<div class="space-y-4">
		<TotalsGrid {game} />
		<ProclamationBar {game} />
		<EtchPanel {game} {onetch} />
		<EntryList {game} {onchisel} />
	</div>
{:else if etchState.ready}
	<div class="py-16 text-center">
		<p class="text-sm font-semibold text-stone-500">碑不在。可能已被磨去。</p>
		<a href={resolve('/')} class="mt-4 inline-block text-sm font-bold text-stone-900 underline"
			>‹ {t('back')}</a
		>
	</div>
{/if}
