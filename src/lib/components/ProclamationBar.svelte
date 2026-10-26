<script lang="ts">
	// 宣告横幅（碑不执法）：终局条件满足时提示，从不锁死任何操作。
	import { templateOf } from '../etch/templates';
	import { nameOf } from '../etch/display';
	import type { Game } from '../etch/types';
	import { t } from '../i18n/i18n.svelte';

	let { game }: { game: Game } = $props();

	const proclamations = $derived(templateOf(game.templateId).detect?.(game) ?? []);
</script>

{#if proclamations.length > 0}
	<div
		class="proclaim-in rounded-lg border-2 border-stone-900 bg-stone-950 px-4 py-3 text-stone-50"
		data-testid="proclamations"
	>
		<div class="text-xs font-bold tracking-widest text-stone-400 uppercase">
			{t('proclTitle')}
		</div>
		<ul class="mt-1 space-y-0.5 text-sm font-semibold">
			{#each proclamations as procl, i (i)}
				<li>
					{#if procl.kind === 'race-won'}
						{t('proclRaceWon', { name: nameOf(game, procl.playerId), threshold: procl.threshold })}
					{:else if procl.kind === 'eliminated'}
						{t('proclEliminated', {
							name: nameOf(game, procl.playerId),
							threshold: procl.threshold
						})}
					{:else if procl.kind === 'last-standing'}
						{t('proclLastStanding', { name: nameOf(game, procl.playerId) })}
					{:else if procl.kind === 'cabo-finished'}
						{t('proclCaboFinished', {
							name: nameOf(game, procl.playerId),
							threshold: procl.threshold
						})}
					{:else}
						{t('proclLevelCapped', { name: nameOf(game, procl.playerId) })}
					{/if}
				</li>
			{/each}
		</ul>
	</div>
{/if}
