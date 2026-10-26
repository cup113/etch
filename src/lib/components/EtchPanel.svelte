<script lang="ts">
	// 刻入面板：按模板渲染一局表单，产出一笔（RoundResult）交给页面落账。
	// 纯展示组件：不碰 store / db，组件测试用 stub onetch 即可。
	import type { RoundResult } from '../etch/templates';
	import { doudizhuRound } from '../etch/templates/doudizhu';
	import { unoEliminationRound, unoRaceRound } from '../etch/templates/uno';
	import { guandanRound } from '../etch/templates/guandan';
	import { caboRound } from '../etch/templates/cabo';
	import {
		declarerGain,
		defenderGain,
		declarerTeamOf,
		shuangshengRound,
		teamLevelsOf,
		SHUANGSHENG_MAX_SCORE
	} from '../etch/templates/shuangsheng';
	import { teamOfSeat } from '../etch/templates/teams';
	import { LEVEL_NAMES } from '../etch/templates/levels';
	import type { Game, PlayerId } from '../etch/types';
	import { t } from '../i18n/i18n.svelte';

	let {
		game,
		onetch
	}: {
		game: Game;
		onetch: (round: RoundResult) => void;
	} = $props();

	let error = $state<string | null>(null);

	// bind:value 在 type="number" 上会被 Svelte 强转成 number（空值仍是 ''），
	// 所以录入状态一律按 string | number 收，读取时统一转文本再解析。
	type Entered = string | number;

	function asText(v: Entered | undefined): string {
		return v === undefined || v === null ? '' : String(v).trim();
	}

	// ---- 通用：每名玩家一个增减输入 ----
	let genericDeltas = $state<Record<PlayerId, Entered>>({});

	// ---- 斗地主 ----
	// 初值取首位玩家即可：本组件只在碑面挂载一次，之后由用户选择驱动。
	// svelte-ignore state_referenced_locally
	let landlord = $state<PlayerId>(game.players[0]?.id ?? '');
	let landlordWon = $state(true);
	let base = $state<Entered>('');
	let multiplier = $state<Entered>('');

	// ---- UNO ----
	// svelte-ignore state_referenced_locally
	let unoWinner = $state<PlayerId>(game.players[0]?.id ?? '');
	let remainders = $state<Record<PlayerId, Entered>>({});

	// ---- 掼蛋 ----
	let winningTeam = $state<0 | 1>(0);
	/** 头游同伴的名次：2 二游（双下）/ 3 三游（单下）/ 4 末游 */
	let partnerRank = $state<2 | 3 | 4>(3);

	// ---- CABO ----
	// svelte-ignore state_referenced_locally
	let caboCaller = $state<PlayerId>(game.players[0]?.id ?? '');
	let caboPoints = $state<Record<PlayerId, Entered>>({});

	// ---- 双升 ----
	/** 用户对本笔庄家的改写；null = 跟随账本推导（declarerTeamOf） */
	let declarerOverride = $state<0 | 1 | null>(null);
	let defendersScore = $state<Entered>('');
	let rollbackOn = $state(false);
	let rollbackTeam = $state<0 | 1>(0);
	let rollbackLevel = $state(0);

	function reset(): void {
		error = null;
		genericDeltas = {};
		base = '';
		multiplier = '';
		remainders = {};
		partnerRank = 3;
		caboPoints = {};
		declarerOverride = null;
		defendersScore = '';
		rollbackOn = false;
		rollbackLevel = 0;
	}

	function fail(message: string): void {
		error = message;
	}

	function parseInts(record: Record<PlayerId, Entered>): { playerId: PlayerId; value: number }[] {
		const out: { playerId: PlayerId; value: number }[] = [];
		for (const p of game.players) {
			const raw = asText(record[p.id]);
			if (!raw) continue;
			const n = Number(raw);
			if (!Number.isInteger(n)) throw new Error(t('checkInput'));
			out.push({ playerId: p.id, value: n });
		}
		return out;
	}

	function submitGeneric(): void {
		try {
			const parsed = parseInts(genericDeltas).filter((x) => x.value !== 0);
			if (parsed.length === 0) return fail(t('checkInput'));
			onetch({
				lines: parsed.map((x) => ({ playerId: x.playerId, delta: x.value })),
				note: parsed.map((x) => `${x.value > 0 ? '+' : ''}${x.value}`).join(' ')
			});
			reset();
		} catch (err) {
			fail(err instanceof Error ? err.message : t('checkInput'));
		}
	}

	function submitDoudizhu(): void {
		try {
			const round = doudizhuRound(
				{
					landlord,
					landlordWon,
					base: Number(asText(base)),
					multiplier: Number(asText(multiplier))
				},
				game.players
			);
			onetch(round);
			reset();
		} catch (err) {
			fail(err instanceof Error ? err.message : t('checkInput'));
		}
	}

	function submitUno(): void {
		if (game.variant.kind !== 'uno') return;
		try {
			const record: Record<PlayerId, number> = {};
			for (const p of game.players) {
				// 出完牌者手里没有牌（输入框是禁用的），不要求填写
				if (p.id === unoWinner) {
					record[p.id] = 0;
					continue;
				}
				const raw = asText(remainders[p.id]);
				if (raw === '') throw new Error(t('checkInput'));
				const n = Number(raw);
				if (!Number.isInteger(n) || n < 0) throw new Error(t('checkInput'));
				record[p.id] = n;
			}
			record[unoWinner] = 0;
			const round =
				game.variant.mode === 'race'
					? unoRaceRound({ winner: unoWinner, remainders: record }, game.players)
					: unoEliminationRound({ winner: unoWinner, remainders: record }, game.players);
			onetch(round);
			reset();
		} catch (err) {
			fail(err instanceof Error ? err.message : t('checkInput'));
		}
	}

	function submitGuandan(): void {
		try {
			const round = guandanRound({ winningTeam, partnerRank }, game.players, game.variant);
			onetch(round);
			reset();
		} catch (err) {
			fail(err instanceof Error ? err.message : t('checkInput'));
		}
	}

	function submitCabo(): void {
		try {
			const record: Record<PlayerId, number> = {};
			for (const p of game.players) {
				// 叫牌者手里没有牌（输入框是禁用的），记 0
				if (p.id === caboCaller) {
					record[p.id] = 0;
					continue;
				}
				const raw = asText(caboPoints[p.id]);
				if (raw === '') throw new Error(t('checkInput'));
				const n = Number(raw);
				if (!Number.isInteger(n) || n < 0) throw new Error(t('checkInput'));
				record[p.id] = n;
			}
			const round = caboRound({ caller: caboCaller, points: record }, game.players);
			onetch(round);
			reset();
		} catch (err) {
			fail(err instanceof Error ? err.message : t('checkInput'));
		}
	}

	const ssDeclarer = $derived(
		declarerOverride ?? (game.templateId === 'shuangsheng' ? declarerTeamOf(game) : (0 as const))
	);

	/** 实时换算预览：分数 → 谁升几级（不合法输入不显示） */
	const ssPreview = $derived.by(() => {
		if (game.variant.kind !== 'shuangsheng') return null;
		const raw = asText(defendersScore);
		if (raw === '') return null;
		const n = Number(raw);
		if (!Number.isInteger(n) || n < 0 || n > SHUANGSHENG_MAX_SCORE) return null;
		if (n >= 80) {
			const gain = defenderGain(n, game.variant) ?? 0;
			return gain === 0 ? t('previewTakeoverNoGain') : t('previewTakeover', { n: gain });
		}
		return t('previewDeclarerUp', { n: declarerGain(n, game.variant) });
	});

	function submitShuangsheng(): void {
		if (game.variant.kind !== 'shuangsheng') return;
		try {
			const round = shuangshengRound(
				{
					declarerTeam: ssDeclarer,
					defendersScore: Number(asText(defendersScore)),
					rollback: rollbackOn ? { team: rollbackTeam, toLevel: rollbackLevel } : undefined
				},
				game.players,
				game.variant,
				teamLevelsOf(game)
			);
			onetch(round);
			reset();
		} catch (err) {
			fail(err instanceof Error ? err.message : t('checkInput'));
		}
	}

	const teamMembers = $derived.by(() => {
		const teams: Record<string, string[]> = { '0': [], '1': [] };
		game.players.forEach((p, seat) => teams[String(teamOfSeat(seat))].push(p.name));
		return teams;
	});
</script>

<div class="rounded-lg border border-stone-300 bg-stone-50 p-4" data-testid="etch-panel">
	{#if game.templateId === 'generic'}
		<div class="space-y-2">
			{#each game.players as p (p.id)}
				<label class="flex items-center gap-3">
					<span class="w-24 shrink-0 truncate text-sm font-medium text-stone-700">{p.name}</span>
					<input
						type="number"
						inputmode="numeric"
						placeholder="0"
						bind:value={genericDeltas[p.id]}
						data-testid="delta-{p.id}"
						class="w-full rounded-md border border-stone-400 bg-white px-3 py-2 text-right text-stone-950
							tabular focus:border-stone-900 focus:outline-none"
					/>
				</label>
			{/each}
		</div>
		<button type="button" class="etch-btn" onclick={submitGeneric} data-testid="etch-submit">
			{t('etchNow')}
		</button>
	{:else if game.templateId === 'doudizhu'}
		<div class="space-y-3">
			<div>
				<div class="mb-1 text-xs font-bold tracking-wider text-stone-500 uppercase">
					{t('landlord')}
				</div>
				<div class="flex gap-2">
					{#each game.players as p (p.id)}
						<button
							type="button"
							class="etch-chip {landlord === p.id ? 'etch-chip-on' : ''}"
							onclick={() => (landlord = p.id)}
							data-testid="landlord-{p.id}"
						>
							{p.name}
						</button>
					{/each}
				</div>
			</div>
			<div class="flex gap-2">
				<button
					type="button"
					class="flex-1 etch-chip {landlordWon ? 'etch-chip-on' : ''}"
					onclick={() => (landlordWon = true)}
					data-testid="side-landlord"
				>
					{t('landlordWin')}
				</button>
				<button
					type="button"
					class="flex-1 etch-chip {!landlordWon ? 'etch-chip-on' : ''}"
					onclick={() => (landlordWon = false)}
					data-testid="side-farmers"
				>
					{t('farmersWin')}
				</button>
			</div>
			<div class="flex gap-3">
				<label class="flex-1">
					<span class="mb-1 block text-xs font-bold tracking-wider text-stone-500 uppercase">
						{t('base')}
					</span>
					<input
						type="number"
						inputmode="numeric"
						min="1"
						bind:value={base}
						data-testid="base"
						class="w-full rounded-md border border-stone-400 bg-white px-3 py-2 text-stone-950 tabular
							focus:border-stone-900 focus:outline-none"
					/>
				</label>
				<label class="flex-1">
					<span class="mb-1 block text-xs font-bold tracking-wider text-stone-500 uppercase">
						{t('multiplier')}
					</span>
					<input
						type="number"
						inputmode="numeric"
						min="1"
						bind:value={multiplier}
						data-testid="multiplier"
						class="w-full rounded-md border border-stone-400 bg-white px-3 py-2 text-stone-950 tabular
							focus:border-stone-900 focus:outline-none"
					/>
				</label>
			</div>
		</div>
		<button type="button" class="etch-btn" onclick={submitDoudizhu} data-testid="etch-submit">
			{t('etchNow')}
		</button>
	{:else if game.templateId === 'uno'}
		<div class="space-y-3">
			<div>
				<div class="mb-1 text-xs font-bold tracking-wider text-stone-500 uppercase">
					{t('roundWinner')}
				</div>
				<div class="flex flex-wrap gap-2">
					{#each game.players as p (p.id)}
						<button
							type="button"
							class="etch-chip {unoWinner === p.id ? 'etch-chip-on' : ''}"
							onclick={() => (unoWinner = p.id)}
							data-testid="winner-{p.id}"
						>
							{p.name}
						</button>
					{/each}
				</div>
			</div>
			<div>
				<div class="mb-1 text-xs font-bold tracking-wider text-stone-500 uppercase">
					{t('remainders')}
				</div>
				<div class="space-y-2">
					{#each game.players as p (p.id)}
						<label class="flex items-center gap-3" data-testid="rem-row-{p.id}">
							<span class="w-24 shrink-0 truncate text-sm font-medium text-stone-700">{p.name}</span
							>
							<input
								type="number"
								inputmode="numeric"
								min="0"
								disabled={unoWinner === p.id}
								bind:value={remainders[p.id]}
								data-testid="rem-{p.id}"
								placeholder="0"
								class="w-full rounded-md border border-stone-400 bg-white px-3 py-2 text-right text-stone-950
									tabular focus:border-stone-900 focus:outline-none disabled:opacity-40"
							/>
						</label>
					{/each}
				</div>
			</div>
		</div>
		<button type="button" class="etch-btn" onclick={submitUno} data-testid="etch-submit">
			{t('etchNow')}
		</button>
	{:else if game.templateId === 'guandan'}
		<div class="space-y-3">
			<div>
				<div class="mb-1 text-xs font-bold tracking-wider text-stone-500 uppercase">
					{t('winningTeam')}
				</div>
				<div class="flex gap-2">
					<button
						type="button"
						class="flex-1 etch-chip {winningTeam === 0 ? 'etch-chip-on' : ''}"
						onclick={() => (winningTeam = 0)}
						data-testid="team-0"
					>
						{teamMembers['0'].join(' · ')}
					</button>
					<button
						type="button"
						class="flex-1 etch-chip {winningTeam === 1 ? 'etch-chip-on' : ''}"
						onclick={() => (winningTeam = 1)}
						data-testid="team-1"
					>
						{teamMembers['1'].join(' · ')}
					</button>
				</div>
			</div>
			<div>
				<div class="mb-1 text-xs font-bold tracking-wider text-stone-500 uppercase">
					{t('partnerRank')}
				</div>
				<div class="flex gap-2">
					<button
						type="button"
						class="flex-1 etch-chip {partnerRank === 2 ? 'etch-chip-on' : ''}"
						onclick={() => (partnerRank = 2)}
						data-testid="rank-2"
					>
						{t('rankSecond')}
					</button>
					<button
						type="button"
						class="flex-1 etch-chip {partnerRank === 3 ? 'etch-chip-on' : ''}"
						onclick={() => (partnerRank = 3)}
						data-testid="rank-3"
					>
						{t('rankThird')}
					</button>
					<button
						type="button"
						class="flex-1 etch-chip {partnerRank === 4 ? 'etch-chip-on' : ''}"
						onclick={() => (partnerRank = 4)}
						data-testid="rank-4"
					>
						{t('rankLast')}
					</button>
				</div>
			</div>
		</div>
		<button type="button" class="etch-btn" onclick={submitGuandan} data-testid="etch-submit">
			{t('etchNow')}
		</button>
	{:else if game.templateId === 'cabo'}
		<div class="space-y-3">
			<div>
				<div class="mb-1 text-xs font-bold tracking-wider text-stone-500 uppercase">
					{t('caboCaller')}
				</div>
				<div class="flex flex-wrap gap-2">
					{#each game.players as p (p.id)}
						<button
							type="button"
							class="etch-chip {caboCaller === p.id ? 'etch-chip-on' : ''}"
							onclick={() => (caboCaller = p.id)}
							data-testid="caller-{p.id}"
						>
							{p.name}
						</button>
					{/each}
				</div>
			</div>
			<div>
				<div class="mb-1 text-xs font-bold tracking-wider text-stone-500 uppercase">
					{t('remainders')}
				</div>
				<div class="space-y-2">
					{#each game.players as p (p.id)}
						<label class="flex items-center gap-3" data-testid="cabo-row-{p.id}">
							<span class="w-24 shrink-0 truncate text-sm font-medium text-stone-700">{p.name}</span
							>
							<input
								type="number"
								inputmode="numeric"
								min="0"
								disabled={caboCaller === p.id}
								bind:value={caboPoints[p.id]}
								data-testid="cabo-pts-{p.id}"
								placeholder="0"
								class="w-full rounded-md border border-stone-400 bg-white px-3 py-2 text-right text-stone-950
									tabular focus:border-stone-900 focus:outline-none disabled:opacity-40"
							/>
						</label>
					{/each}
				</div>
			</div>
		</div>
		<button type="button" class="etch-btn" onclick={submitCabo} data-testid="etch-submit">
			{t('etchNow')}
		</button>
	{:else if game.templateId === 'shuangsheng'}
		<div class="space-y-3">
			<div>
				<div class="mb-1 text-xs font-bold tracking-wider text-stone-500 uppercase">
					{t('declarer')}
				</div>
				<div class="flex gap-2">
					<button
						type="button"
						class="flex-1 etch-chip {ssDeclarer === 0 ? 'etch-chip-on' : ''}"
						onclick={() => (declarerOverride = 0)}
						data-testid="declarer-0"
					>
						{teamMembers['0'].join(' · ')}
					</button>
					<button
						type="button"
						class="flex-1 etch-chip {ssDeclarer === 1 ? 'etch-chip-on' : ''}"
						onclick={() => (declarerOverride = 1)}
						data-testid="declarer-1"
					>
						{teamMembers['1'].join(' · ')}
					</button>
				</div>
			</div>
			<label>
				<span class="mb-1 block text-xs font-bold tracking-wider text-stone-500 uppercase">
					{t('defendersScore')}
				</span>
				<input
					type="number"
					inputmode="numeric"
					min="0"
					max={SHUANGSHENG_MAX_SCORE}
					bind:value={defendersScore}
					data-testid="defenders-score"
					class="w-full rounded-md border border-stone-400 bg-white px-3 py-2 text-right text-stone-950 tabular
						focus:border-stone-900 focus:outline-none"
				/>
				{#if ssPreview}
					<span class="mt-1 block text-xs font-semibold text-stone-500" data-testid="ss-preview">
						{ssPreview}
					</span>
				{/if}
			</label>
			{#if game.variant.kind === 'shuangsheng' && game.variant.allowRollback}
				<div class="rounded-md border border-stone-300 p-3">
					<label class="flex items-center gap-2 text-sm font-medium text-stone-700">
						<input
							type="checkbox"
							bind:checked={rollbackOn}
							class="h-4 w-4 rounded border-stone-400"
							data-testid="rollback-toggle"
						/>
						{t('rollbackToggle')}
					</label>
					{#if rollbackOn}
						<div class="mt-2 space-y-2">
							<div>
								<div class="mb-1 text-xs font-bold tracking-wider text-stone-500 uppercase">
									{t('rollbackTeam')}
								</div>
								<div class="flex gap-2">
									<button
										type="button"
										class="flex-1 etch-chip {rollbackTeam === 0 ? 'etch-chip-on' : ''}"
										onclick={() => (rollbackTeam = 0)}
										data-testid="rollback-team-0"
									>
										{teamMembers['0'].join(' · ')}
									</button>
									<button
										type="button"
										class="flex-1 etch-chip {rollbackTeam === 1 ? 'etch-chip-on' : ''}"
										onclick={() => (rollbackTeam = 1)}
										data-testid="rollback-team-1"
									>
										{teamMembers['1'].join(' · ')}
									</button>
								</div>
							</div>
							<label class="flex items-center justify-between">
								<span class="text-sm font-semibold text-stone-800">{t('rollbackTo')}</span>
								<select
									bind:value={rollbackLevel}
									data-testid="rollback-level"
									class="rounded-md border border-stone-400 bg-white px-3 py-2 text-stone-950"
								>
									{#each LEVEL_NAMES as name, idx (name)}
										<option value={idx}>{name}</option>
									{/each}
								</select>
							</label>
						</div>
					{/if}
				</div>
			{/if}
		</div>
		<button type="button" class="etch-btn" onclick={submitShuangsheng} data-testid="etch-submit">
			{t('etchNow')}
		</button>
	{/if}

	{#if error}
		<p class="mt-2 text-sm font-medium text-stone-700" data-testid="etch-error">{error}</p>
	{/if}
</div>
