<script lang="ts">
	// 刻入面板：按模板渲染一局表单，产出一笔（RoundResult）交给页面落账。
	// 纯展示组件：不碰 store / db，组件测试用 stub onetch 即可。
	import type { RoundResult } from '../etch/templates';
	import { doudizhuRound } from '../etch/templates/doudizhu';
	import { unoEliminationRound, unoRaceRound } from '../etch/templates/uno';
	import { guandanRound } from '../etch/templates/guandan';
	import { teamOfSeat } from '../etch/templates/guandan';
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
	let doubleDown = $state(false);

	function reset(): void {
		error = null;
		genericDeltas = {};
		base = '';
		multiplier = '';
		remainders = {};
		doubleDown = false;
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
			const round = guandanRound({ winningTeam, doubleDown }, game.players, game.variant);
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
			<label class="flex items-center gap-2 text-sm font-medium text-stone-700">
				<input type="checkbox" bind:checked={doubleDown} class="h-4 w-4 rounded border-stone-400" />
				{t('doubleDown')}
			</label>
		</div>
		<button type="button" class="etch-btn" onclick={submitGuandan} data-testid="etch-submit">
			{t('etchNow')}
		</button>
	{/if}

	{#if error}
		<p class="mt-2 text-sm font-medium text-stone-700" data-testid="etch-error">{error}</p>
	{/if}
</div>
