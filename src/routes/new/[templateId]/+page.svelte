<script lang="ts">
	// 开碑：碑名（可选）→ 选变体 → 按座位序加玩家（combobox，名册联想/显式新建）→ 开碑进碑面。
	// 变体区只放结论式标签；机理与例子收在信息图标里（InfoHint）。
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { addOrReusePlayer, createTablet } from '../../../lib/etch/store.svelte';
	import { templateOf } from '../../../lib/etch/templates';
	import { teamOfSeat } from '../../../lib/etch/templates/teams';
	import { tplNameKey } from '../../../lib/etch/display';
	import type {
		Player,
		PlayerId,
		PlayerRef,
		ShuangshengDeclarerFlow,
		TemplateId,
		Variant
	} from '../../../lib/etch/types';
	import { t } from '../../../lib/i18n/i18n.svelte';
	import PlayerCombobox from '../../../lib/components/PlayerCombobox.svelte';
	import InfoHint from '../../../lib/components/InfoHint.svelte';

	const templateId = $derived(page.params.templateId as TemplateId);
	const template = $derived(templateOf(templateId));

	// 变体局部状态
	let unoMode = $state<'race' | 'elimination'>('race');
	let unoThreshold = $state(500);
	let guandanSecond = $state<2 | 3>(3);
	let guandanThird = $state<1 | 2>(2);
	let caboThreshold = $state(100);
	let ssLevelsAt80 = $state<0 | 1>(0);
	let ssCap = $state<160 | 200 | 0>(0);
	let ssGrandBonus = $state(false);
	let ssAllowRollback = $state(false);
	let ssDeclarerFlow = $state<ShuangshengDeclarerFlow>('rotate');
	/** 首庄（人）；留空则在第一笔刻入时选 */
	let ssFirstDeclarer = $state<PlayerId | null>(null);

	let tabletName = $state('');
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
		const removed = picked[i];
		picked = picked.filter((_, idx) => idx !== i);
		if (removed && ssFirstDeclarer === removed.id) ssFirstDeclarer = null;
	}

	async function start(): Promise<void> {
		error = null;
		if (picked.length < template.minPlayers) {
			error = t('needPlayers', { n: template.minPlayers });
			return;
		}
		const ssFirstSeat = picked.findIndex((p) => p.id === ssFirstDeclarer);
		const ssFirstTeam = ssFirstSeat >= 0 ? teamOfSeat(ssFirstSeat) : 0;
		const variant: Variant =
			templateId === 'uno'
				? {
						kind: 'uno',
						mode: unoMode,
						threshold: unoThreshold || (unoMode === 'race' ? 500 : 300)
					}
				: templateId === 'guandan'
					? {
							kind: 'guandan',
							levelsPerDoubleDown: guandanSecond,
							levelsPerSingleDown: guandanThird
						}
					: templateId === 'cabo'
						? { kind: 'cabo', threshold: caboThreshold || 100 }
						: templateId === 'shuangsheng'
							? {
									kind: 'shuangsheng',
									levelsAt80: ssLevelsAt80,
									defenderCapScore: ssCap,
									grandWinBonus: ssGrandBonus,
									allowRollback: ssAllowRollback,
									firstDeclarerTeam: ssFirstTeam,
									declarerFlow: ssDeclarerFlow,
									...(ssFirstSeat >= 0 ? { firstDeclarer: picked[ssFirstSeat].id } : {})
								}
							: templateId === 'doudizhu'
								? { kind: 'doudizhu' }
								: { kind: 'generic' };
		const game = await createTablet(templateId, variant, picked, tabletName);
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

<section class="mb-6">
	<input
		type="text"
		bind:value={tabletName}
		maxlength="20"
		placeholder={t('tabletNamePlaceholder')}
		data-testid="tablet-name"
		class="w-full rounded-md border border-stone-400 bg-stone-50 px-3 py-2 text-stone-950
			placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
	/>
</section>

{#if templateId === 'uno'}
	<section class="mb-6">
		<div class="mb-2 flex flex-wrap items-center gap-1">
			<h2 class="text-xs font-bold tracking-widest text-stone-500 uppercase">{t('variant')}</h2>
			<InfoHint
				label={t('infoUnoMode')}
				testid="uno-mode"
				table={{
					head: [t('colMode'), t('colScoringEnd')],
					rows: [
						[t('unoModeRace'), t('unoRaceCell')],
						[t('unoModeElimination'), t('unoEliminationCell')]
					],
					note: t('unoExample')
				}}
			/>
		</div>
		<div class="flex gap-2">
			<button
				type="button"
				class="flex-1 etch-chip {unoMode === 'race' ? 'etch-chip-on' : ''}"
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
				class="flex-1 etch-chip {unoMode === 'elimination' ? 'etch-chip-on' : ''}"
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
		<div class="mb-2 flex flex-wrap items-center gap-1">
			<h2 class="text-xs font-bold tracking-widest text-stone-500 uppercase">{t('variant')}</h2>
			<InfoHint
				label={t('infoGuandanRanks')}
				testid="guandan-ranks"
				table={{
					head: [t('colPartnerFinish'), t('colLevels')],
					rows: [
						[t('rankSecond'), `+${guandanSecond}`],
						[t('rankThird'), `+${guandanThird}`],
						[t('rankLast'), '+1']
					],
					note: t('guandanNote')
				}}
			/>
		</div>
		<label class="flex items-center justify-between">
			<span class="text-sm font-semibold text-stone-800">{t('levelsAtSecond')}</span>
			<select
				bind:value={guandanSecond}
				data-testid="guandan-second"
				class="rounded-md border border-stone-400 bg-white px-3 py-2 text-stone-950"
			>
				<option value={2}>+2</option>
				<option value={3}>+3</option>
			</select>
		</label>
		<label class="mt-2 flex items-center justify-between">
			<span class="text-sm font-semibold text-stone-800">{t('levelsAtThird')}</span>
			<select
				bind:value={guandanThird}
				data-testid="guandan-third"
				class="rounded-md border border-stone-400 bg-white px-3 py-2 text-stone-950"
			>
				<option value={1}>+1</option>
				<option value={2}>+2</option>
			</select>
		</label>
	</section>
{:else if templateId === 'cabo'}
	<section class="mb-6">
		<div class="mb-2 flex flex-wrap items-center gap-1">
			<h2 class="text-xs font-bold tracking-widest text-stone-500 uppercase">{t('variant')}</h2>
		</div>
		<div class="flex flex-wrap items-center justify-between gap-2">
			<span class="flex items-center gap-1 text-sm font-semibold text-stone-800">
				{t('caboThreshold')}
				<InfoHint
					label={t('infoCaboThreshold')}
					testid="cabo-threshold"
					table={{
						head: [t('colWho'), t('colPoints')],
						rows: [
							[t('caboWhoCaller'), '0'],
							[t('caboWhoOthers'), t('caboPointsOwn')]
						],
						note: t('caboNote')
					}}
				/>
			</span>
			<input
				type="number"
				inputmode="numeric"
				min="1"
				bind:value={caboThreshold}
				data-testid="cabo-threshold"
				class="w-24 rounded-md border border-stone-400 bg-white px-3 py-2 text-right text-stone-950 tabular
					focus:border-stone-900 focus:outline-none"
			/>
		</div>
	</section>
{:else if templateId === 'shuangsheng'}
	<section class="mb-6">
		<h2 class="mb-2 text-xs font-bold tracking-widest text-stone-500 uppercase">{t('variant')}</h2>
		<div class="space-y-3">
			<div>
				<div class="flex flex-wrap items-center gap-1">
					<span class="text-xs font-bold tracking-wider text-stone-500 uppercase">
						{t('levelsAt80')}
					</span>
					<InfoHint
						label={t('infoLevelsAt80')}
						testid="ss-levels-at-80"
						table={{
							head: [t('colDefenderScore'), t('levelsAt80Pick0'), t('levelsAt80Pick1')],
							rows: [
								['80', '0', '+1'],
								['120', '+1', '+2'],
								['160', '+2', '+3'],
								['200', '+3', '+4']
							],
							note: t('levelsAt80Note')
						}}
					/>
				</div>
				<div class="mt-1 flex gap-2">
					<button
						type="button"
						class="flex-1 etch-chip {ssLevelsAt80 === 0 ? 'etch-chip-on' : ''}"
						onclick={() => (ssLevelsAt80 = 0)}
						data-testid="ss-at80-0"
					>
						{t('levelsAt80None')}
					</button>
					<button
						type="button"
						class="flex-1 etch-chip {ssLevelsAt80 === 1 ? 'etch-chip-on' : ''}"
						onclick={() => (ssLevelsAt80 = 1)}
						data-testid="ss-at80-1"
					>
						{t('levelsAt80One')}
					</button>
				</div>
			</div>
			<div class="flex flex-wrap items-center justify-between gap-2">
				<span class="flex items-center gap-1 text-sm font-semibold text-stone-800">
					{t('defenderCap')}
					<InfoHint
						label={t('infoDefenderCap')}
						testid="ss-cap"
						table={{
							head: [t('colCap'), t('colLimit')],
							rows: [
								[t('capNone'), t('capNoLimit')],
								[t('capAt160'), t('capCeiling2')],
								[t('capAt200'), t('capCeiling3')]
							]
						}}
					/>
				</span>
				<select
					bind:value={ssCap}
					data-testid="ss-cap"
					class="rounded-md border border-stone-400 bg-white px-3 py-2 text-stone-950"
				>
					<option value={0}>{t('capNone')}</option>
					<option value={160}>{t('capAt160')}</option>
					<option value={200}>{t('capAt200')}</option>
				</select>
			</div>
			<div class="flex flex-wrap items-center justify-between gap-2">
				<span class="flex items-center gap-1 text-sm font-medium text-stone-700">
					{t('grandWinBonus')}
					<InfoHint
						label={t('infoGrandWinBonus')}
						text={t('grandWinBonusHelp')}
						testid="ss-grand-bonus"
					/>
				</span>
				<input
					type="checkbox"
					bind:checked={ssGrandBonus}
					class="h-4 w-4 rounded border-stone-400"
					data-testid="ss-grand-bonus"
				/>
			</div>
			<div class="flex flex-wrap items-center justify-between gap-2">
				<span class="flex items-center gap-1 text-sm font-medium text-stone-700">
					{t('allowRollback')}
					<InfoHint
						label={t('infoAllowRollback')}
						text={t('allowRollbackHelp')}
						testid="ss-allow-rollback"
					/>
				</span>
				<input
					type="checkbox"
					bind:checked={ssAllowRollback}
					class="h-4 w-4 rounded border-stone-400"
					data-testid="ss-allow-rollback"
				/>
			</div>
			<div>
				<div class="flex flex-wrap items-center gap-1">
					<span class="text-xs font-bold tracking-wider text-stone-500 uppercase">
						{t('declarerFlow')}
					</span>
					<InfoHint
						label={t('infoDeclarerFlow')}
						testid="ss-declarer-flow"
						table={{
							head: [t('colFlow'), t('colNextDealer')],
							rows: [
								[t('declarerFlowRotate'), t('declarerFlowRotateCell')],
								[t('declarerFlowReveal'), t('declarerFlowRevealCell')],
								[t('declarerFlowDesignate'), t('declarerFlowDesignateCell')]
							],
							note: t('declarerFlowNote')
						}}
					/>
				</div>
				<div class="mt-1 flex gap-2">
					<button
						type="button"
						class="flex-1 etch-chip {ssDeclarerFlow === 'rotate' ? 'etch-chip-on' : ''}"
						onclick={() => (ssDeclarerFlow = 'rotate')}
						data-testid="ss-flow-rotate"
					>
						{t('declarerFlowRotate')}
					</button>
					<button
						type="button"
						class="flex-1 etch-chip {ssDeclarerFlow === 'reveal' ? 'etch-chip-on' : ''}"
						onclick={() => (ssDeclarerFlow = 'reveal')}
						data-testid="ss-flow-reveal"
					>
						{t('declarerFlowReveal')}
					</button>
					<button
						type="button"
						class="flex-1 etch-chip {ssDeclarerFlow === 'designate' ? 'etch-chip-on' : ''}"
						onclick={() => (ssDeclarerFlow = 'designate')}
						data-testid="ss-flow-designate"
					>
						{t('declarerFlowDesignate')}
					</button>
				</div>
			</div>
		</div>
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
	<p class="mt-2 text-xs text-stone-400">
		{template.teams ? t('seatTeamsHint') : t('seatHint')}
	</p>

	<ol class="mt-3 space-y-2">
		{#each picked as p, seat (p.id)}
			<li
				class="flex items-center justify-between rounded-md border border-stone-300 bg-stone-50 px-3 py-2"
				data-testid="picked-{p.id}"
			>
				<span class="text-sm font-bold text-stone-900">
					<span class="mr-2 text-stone-400 tabular">{seat + 1}</span>
					{p.name}
					{#if templateId === 'guandan' || templateId === 'shuangsheng'}
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

{#if templateId === 'shuangsheng' && picked.length === 4}
	<section class="mb-6">
		<div class="mb-2 flex flex-wrap items-center gap-1">
			<h2 class="text-xs font-bold tracking-widest text-stone-500 uppercase">
				{t('firstDeclarer')}
			</h2>
			<InfoHint
				label={t('infoFirstDeclarer')}
				text={t('firstDeclarerHelp')}
				testid="ss-first-declarer"
			/>
		</div>
		<div class="grid grid-cols-2 gap-2">
			{#each [0, 2, 1, 3] as seat (seat)}
				{@const p = picked[seat]}
				{#if p}
					<button
						type="button"
						class="etch-chip {ssFirstDeclarer === p.id ? 'etch-chip-on' : ''}"
						onclick={() => (ssFirstDeclarer = p.id)}
						data-testid="first-declarer-seat-{seat}"
					>
						{p.name}
					</button>
				{/if}
			{/each}
		</div>
	</section>
{/if}

{#if error}
	<p class="mb-3 text-sm font-semibold text-stone-700" data-testid="new-error">{error}</p>
{/if}

<button type="button" class="etch-btn" onclick={() => void start()} data-testid="start-tablet">
	{t('startTablet')}
</button>
