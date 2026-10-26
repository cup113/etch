<script lang="ts">
	// 开碑：选变体 → 按座位序加玩家（combobox，名册联想/显式新建）→ 开碑进碑面。
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { addOrReusePlayer, createTablet } from '../../../lib/etch/store.svelte';
	import { templateOf } from '../../../lib/etch/templates';
	import { teamOfSeat } from '../../../lib/etch/templates/guandan';
	import { tplNameKey } from '../../../lib/etch/display';
	import type { Player, PlayerRef, TemplateId, Variant } from '../../../lib/etch/types';
	import { t } from '../../../lib/i18n/i18n.svelte';
	import PlayerCombobox from '../../../lib/components/PlayerCombobox.svelte';

	const templateId = $derived(page.params.templateId as TemplateId);
	const template = $derived(templateOf(templateId));

	// 变体局部状态
	let unoMode = $state<'race' | 'elimination'>('race');
	let unoThreshold = $state(500);
	let guandanJump = $state<1 | 2 | 3>(2);

	let picked = $state<PlayerRef[]>([]);
	let error = $state<string | null>(null);

	const full = $derived(picked.length >= template.maxPlayers);

	async function onpick(name: string): Promise<void> {
		if (full) return;
		error = null;
		const player: Player = await addOrReusePlayer(name);
		if (picked.some((p) => p.id === player.id)) return; // 同人重复加入：忽略
		picked = [...picked, { id: player.id, name: player.name }];
	}

	function removeAt(i: number): void {
		picked = picked.filter((_, idx) => idx !== i);
	}

	async function start(): Promise<void> {
		error = null;
		if (picked.length < template.minPlayers) {
			error = t('needPlayers', { n: template.minPlayers });
			return;
		}
		const variant: Variant =
			templateId === 'uno'
				? {
						kind: 'uno',
						mode: unoMode,
						threshold: unoThreshold || (unoMode === 'race' ? 500 : 300)
					}
				: templateId === 'guandan'
					? { kind: 'guandan', levelsPerDoubleDown: guandanJump }
					: templateId === 'doudizhu'
						? { kind: 'doudizhu' }
						: { kind: 'generic' };
		const game = await createTablet(templateId, variant, picked);
		await goto(resolve('/game/[id]', { id: game.id }));
	}
</script>

<header class="mb-6">
	<a href={resolve('/')} class="text-xs font-bold tracking-widest text-stone-500 uppercase"
		>‹ {t('back')}</a
	>
	<h1 class="mt-2 text-3xl font-black tracking-tight text-stone-950" data-testid="new-title">
		{t(tplNameKey[templateId])}
	</h1>
</header>

{#if templateId === 'uno'}
	<section class="mb-6">
		<h2 class="mb-2 text-xs font-bold tracking-widest text-stone-500 uppercase">{t('variant')}</h2>
		<div class="space-y-2">
			<button
				type="button"
				class="block w-full etch-chip text-left {unoMode === 'race' ? 'etch-chip-on' : ''}"
				onclick={() => {
					unoMode = 'race';
					unoThreshold = 500;
				}}
				data-testid="uno-race"
			>
				{t('unoModeRace')}
			</button>
			<button
				type="button"
				class="block w-full etch-chip text-left {unoMode === 'elimination' ? 'etch-chip-on' : ''}"
				onclick={() => {
					unoMode = 'elimination';
					unoThreshold = 300;
				}}
				data-testid="uno-elimination"
			>
				{t('unoModeElimination')}
			</button>
		</div>
		<label class="mt-3 flex items-center justify-between">
			<span class="text-sm font-semibold text-stone-800">
				{unoMode === 'race' ? t('targetScore') : t('eliminateAt')}
			</span>
			<input
				type="number"
				inputmode="numeric"
				min="1"
				bind:value={unoThreshold}
				data-testid="uno-threshold"
				class="w-24 rounded-md border border-stone-400 bg-white px-3 py-2 text-right text-stone-950 tabular
					focus:border-stone-900 focus:outline-none"
			/>
		</label>
	</section>
{:else if templateId === 'guandan'}
	<section class="mb-6">
		<h2 class="mb-2 text-xs font-bold tracking-widest text-stone-500 uppercase">{t('variant')}</h2>
		<label class="flex items-center justify-between">
			<span class="text-sm font-semibold text-stone-800">{t('doubleDownLevels')}</span>
			<select
				bind:value={guandanJump}
				data-testid="guandan-jump"
				class="rounded-md border border-stone-400 bg-white px-3 py-2 text-stone-950"
			>
				<option value={1}>+1</option>
				<option value={2}>+2</option>
				<option value={3}>+3</option>
			</select>
		</label>
	</section>
{/if}

<section class="mb-6">
	<h2 class="mb-2 text-xs font-bold tracking-widest text-stone-500 uppercase">
		{t('players')}（{picked.length}/{template.maxPlayers}）
	</h2>
	<PlayerCombobox
		placeholder={t('playerPlaceholder')}
		onpick={(name) => void onpick(name)}
		disabled={full}
	/>
	<p class="mt-2 text-xs text-stone-400">{t('seatHint')}</p>

	<ol class="mt-3 space-y-2">
		{#each picked as p, seat (p.id)}
			<li
				class="flex items-center justify-between rounded-md border border-stone-300 bg-stone-50 px-3 py-2"
				data-testid="picked-{p.id}"
			>
				<span class="text-sm font-bold text-stone-900">
					<span class="mr-2 text-stone-400 tabular">{seat + 1}</span>
					{p.name}
					{#if templateId === 'guandan'}
						<span class="ml-2 text-xs font-semibold text-stone-500">
							{t('teamLabel', { n: teamOfSeat(seat) + 1 })}
						</span>
					{/if}
				</span>
				<button
					type="button"
					class="text-stone-400"
					onclick={() => removeAt(seat)}
					aria-label={t('cancel')}
					data-testid="unpick-{p.id}"
				>
					✕
				</button>
			</li>
		{/each}
	</ol>
</section>

{#if error}
	<p class="mb-3 text-sm font-semibold text-stone-700" data-testid="new-error">{error}</p>
{/if}

<button type="button" class="etch-btn" onclick={() => void start()} data-testid="start-tablet">
	{t('startTablet')}
</button>
