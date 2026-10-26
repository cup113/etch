<script lang="ts">
	// 总分：折叠出的大数字。"刻进去"动效由 {#key} 在数值变化时重放。
	import { fold } from '../etch/ledger';
	import { levelName } from '../etch/templates/levels';
	import type { Game } from '../etch/types';

	let { game }: { game: Game } = $props();

	const totals = $derived(fold(game));
	/** 级数型模板（掼蛋 / 双升）：大数字显示级牌名，副行显示原始级数 */
	const isLevelGame = $derived(game.templateId === 'guandan' || game.templateId === 'shuangsheng');
</script>

<div class="grid grid-cols-2 gap-3" data-testid="totals">
	{#each game.players as p (p.id)}
		<div
			class="rounded-lg border border-stone-300 bg-stone-50 px-3 py-4 text-center"
			data-testid="total-{p.id}"
		>
			<div class="truncate text-sm font-medium text-stone-600">{p.name}</div>
			{#key totals[p.id] ?? 0}
				<div
					class="etch-in mt-1 text-4xl font-black text-stone-950 tabular
						{totals[p.id] < 0 ? 'text-stone-500' : ''}"
				>
					{isLevelGame ? levelName(totals[p.id] ?? 0) : (totals[p.id] ?? 0)}
				</div>
			{/key}
			{#if isLevelGame}
				<div class="mt-0.5 text-xs text-stone-500 tabular">Lv {totals[p.id] ?? 0}</div>
			{/if}
		</div>
	{/each}
</div>
