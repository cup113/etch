<script lang="ts">
	// 下一局条：双升的庄家 / 掼蛋的名次与进贡，全部由未凿笔 + 变体推导。
	// 只读，不写任何状态；凿除最后一笔即回滚。
	import { nameOf } from '../etch/display';
	import { isChiseled } from '../etch/ledger';
	import { nextDealerOf } from '../etch/templates/shuangsheng';
	import { lastFinishOf, tributeOf, type Tribute } from '../etch/templates/guandan';
	import { teamOfSeat } from '../etch/templates/teams';
	import type { Game, PlayerId } from '../etch/types';
	import { t } from '../i18n/i18n.svelte';
	import InfoHint from './InfoHint.svelte';

	let { game }: { game: Game } = $props();

	const hasEntries = $derived(
		game.entries.some((e) => e.kind !== 'chisel' && !isChiseled(game, e.id))
	);
	const ssNext = $derived(game.templateId === 'shuangsheng' ? nextDealerOf(game) : null);
	const gdLast = $derived(game.templateId === 'guandan' ? lastFinishOf(game) : null);
	const gdTribute = $derived(gdLast ? tributeOf(gdLast.finish, game.players) : null);
	/** 没有笔也没有首庄时整条隐藏，不在第一局前制造噪音。 */
	const showDealer = $derived(!!ssNext && (hasEntries || ssNext.kind === 'known'));

	function teamNames(team: 0 | 1): string {
		return game.players
			.filter((_, seat) => teamOfSeat(seat) === team)
			.map((p) => p.name)
			.join('·');
	}

	function namesOf(ids: PlayerId[]): string {
		return ids.map((id) => nameOf(game, id)).join('、');
	}

	function tributeLine(tribute: Tribute): string {
		if (tribute.kind === 'double') {
			return t('tributeDouble', {
				payers: namesOf(tribute.payers),
				receivers: namesOf(tribute.receivers)
			});
		}
		if (tribute.kind === 'single') {
			return t('tributeSingle', {
				payer: nameOf(game, tribute.payer),
				receiver: nameOf(game, tribute.receiver)
			});
		}
		return t('tributeNone');
	}
</script>

{#if ssNext && showDealer}
	<div
		class="flex items-start justify-between gap-2 rounded-lg border border-stone-300 bg-white px-4 py-3"
		data-testid="round-setup"
	>
		<p class="min-w-0 text-sm font-bold text-balance text-stone-900" data-testid="next-dealer">
			{#if ssNext.kind === 'known'}
				{t(hasEntries ? 'dealerNextRound' : 'dealerThisRound', {
					name: nameOf(game, ssNext.declarer)
				})}
				<span class="ml-1 text-xs font-semibold text-stone-500">（{teamNames(ssNext.team)}）</span>
			{:else if ssNext.kind === 'team-only'}
				{t('dealerTeamOnly', { teams: teamNames(ssNext.team) })}
			{:else if ssNext.flow === 'reveal'}
				{t('dealerReveal')}
			{:else}
				{t('dealerDesignate')}
			{/if}
		</p>
		<InfoHint
			label={t('infoDeclarerFlow')}
			testid="next-dealer-flow"
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
{:else if gdLast && gdTribute}
	<div
		class="flex items-start justify-between gap-2 rounded-lg border border-stone-300 bg-white px-4 py-3"
		data-testid="round-setup"
	>
		<div class="min-w-0 space-y-0.5">
			<p class="text-sm font-bold text-stone-900" data-testid="last-finish">
				{t('lastRound', {
					first: nameOf(game, gdLast.finish[0]),
					second: nameOf(game, gdLast.finish[1]),
					third: nameOf(game, gdLast.finish[2]),
					last: nameOf(game, gdLast.finish[3])
				})}
			</p>
			<p class="text-xs font-semibold text-balance text-stone-500" data-testid="tribute">
				{tributeLine(gdTribute)}
			</p>
		</div>
		<InfoHint
			label={t('infoTribute')}
			testid="tribute"
			table={{
				head: [t('colSituation'), t('colTribute')],
				rows: [
					[t('tributeDoubleDown'), t('tributeDoubleCell')],
					[t('tributeSingleDown'), t('tributeSingleCell')],
					[t('tributeOneFour'), t('tributeLastCell')]
				],
				note: t('tributeNote')
			}}
		/>
	</div>
{/if}
