<script lang="ts">
	// 玩家 combobox（决策 5）：输入时联想花名册，回车 = 显式加入（新名字顺手入册）。
	import { etchState } from '../etch/store.svelte';

	let {
		placeholder,
		onpick,
		disabled = false
	}: {
		placeholder?: string;
		onpick: (name: string) => void;
		disabled?: boolean;
	} = $props();

	let text = $state('');

	const suggestions = $derived.by(() => {
		const q = text.trim().toLowerCase();
		if (!q) return [];
		return etchState.roster.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 5);
	});

	function pick(name: string): void {
		const trimmed = name.trim();
		if (!trimmed) return;
		onpick(trimmed);
		text = '';
	}
</script>

<div class="w-full" data-testid="player-combobox">
	<input
		type="text"
		bind:value={text}
		{placeholder}
		{disabled}
		autocomplete="off"
		class="w-full rounded-md border border-stone-400 bg-stone-50 px-3 py-2 text-stone-950
			placeholder:text-stone-400 focus:border-stone-900 focus:outline-none
			disabled:opacity-40"
		onkeydown={(e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				pick(text);
			}
		}}
	/>
	{#if suggestions.length > 0}
		<ul
			class="mt-1 divide-y divide-stone-200 rounded-md border border-stone-300 bg-stone-50 text-sm"
		>
			{#each suggestions as s (s.id)}
				<li>
					<button
						type="button"
						class="block w-full px-3 py-2 text-left hover:bg-stone-200"
						onclick={() => pick(s.name)}
					>
						{s.name}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
