<script lang="ts">
	// 刻痕流：最新在上；被凿的笔划掉显示、保留在账（ADR-0001）。
	// 点击一笔展开凿除（两步确认，不弹系统对话框）。
	import { isChiseled, roundOf } from '../etch/ledger';
	import { nameOf, signed } from '../etch/display';
	import type { Game } from '../etch/types';
	import { t } from '../i18n/i18n.svelte';

	let {
		game,
		onchisel
	}: {
		game: Game;
		onchisel: (entryId: string) => void;
	} = $props();

	let expanded = $state<string | null>(null);
	let confirming = $state<string | null>(null);

	const ordered = $derived([...game.entries].reverse());
</script>

<div class="space-y-1.5" data-testid="entries">
	{#each ordered as entry (entry.id)}
		{@const chiseled = isChiseled(game, entry.id)}
		{@const round = roundOf(game, entry)}
		{#if entry.kind === 'chisel'}
			<div class="px-2 py-1 text-xs text-stone-400" data-testid="chisel-row-{entry.id}">
				⟶ {t('chiselEntryRow', { n: round })}
			</div>
		{:else}
			<div
				class="rounded-md border px-3 py-2
					{chiseled
					? 'border-stone-200 bg-stone-50 text-stone-400'
					: 'border-stone-300 bg-stone-50 text-stone-800'}"
				data-testid="entry-{entry.id}"
			>
				<button
					type="button"
					class="flex w-full items-center justify-between gap-2 text-left"
					data-testid="entry-toggle-{entry.id}"
					aria-expanded={expanded === entry.id}
					onclick={() =>
						confirming === entry.id
							? (confirming = null)
							: (expanded = expanded === entry.id ? null : entry.id)}
				>
					<span class="text-xs font-bold tracking-wider text-stone-500 uppercase">
						{t('markNo', { n: round })}
					</span>
					<span class="flex-1 text-right text-sm tabular {chiseled ? 'line-through' : ''}">
						{#each entry.lines as line, i (i)}
							<span class="ml-2">
								{signed(line.delta)}
								{nameOf(game, line.playerId)}
							</span>
						{/each}
					</span>
					{#if chiseled}
						<span class="shrink-0 text-xs text-stone-400">{t('chiseledLabel')}</span>
					{/if}
				</button>
				{#if expanded === entry.id}
					<div class="mt-2 flex items-center justify-between border-t border-stone-200 pt-2">
						{#if entry.note}<span class="text-xs text-stone-500 tabular">{entry.note}</span
							>{:else}<span></span>{/if}
						{#if !chiseled}
							{#if confirming === entry.id}
								<div class="flex items-center gap-2 text-xs">
									<span class="text-stone-600">{t('chiselConfirm')}</span>
									<button
										type="button"
										class="etch-chip etch-chip-on"
										onclick={() => {
											onchisel(entry.id);
											confirming = null;
											expanded = null;
										}}
										data-testid="chisel-confirm-{entry.id}"
									>
										{t('chiselAction')}
									</button>
									<button
										type="button"
										class="etch-chip"
										onclick={() => (confirming = null)}
										data-testid="chisel-cancel-{entry.id}"
									>
										{t('cancel')}
									</button>
								</div>
							{:else}
								<button
									type="button"
									class="etch-chip"
									onclick={() => (confirming = entry.id)}
									data-testid="chisel-ask-{entry.id}"
								>
									{t('chiselAction')}
								</button>
							{/if}
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	{/each}
</div>
