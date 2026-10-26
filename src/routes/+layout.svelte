<script lang="ts">
	import { onMount } from 'svelte';
	import './layout.css';
	import favicon from '../lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';
	import { etchState, initEtch } from '../lib/etch/store.svelte';
	import { initSettings } from '../lib/etch/settings.svelte';
	import { initI18n, i18nReady, t, currentLang } from '../lib/i18n/i18n.svelte';

	let { children }: LayoutProps = $props();

	onMount(() => {
		void initI18n();
		void initSettings();
		void initEtch();
	});

	// 语言切换时同步 <html lang>（屏幕阅读器/输入法）
	$effect(() => {
		if (i18nReady()) document.documentElement.lang = currentLang();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<title>Etch — Scores that never vanish.</title>
	<meta
		name="description"
		content="Etch — Scores that never vanish. 网页计分器：刻上去，就不消失。"
	/>
</svelte:head>

{#if etchState.ready && i18nReady()}
	<div class="mx-auto min-h-dvh w-full max-w-md px-4 pt-8 pb-16">
		{@render children()}
	</div>

	{#if etchState.memoryOnly}
		<div
			class="fixed inset-x-0 bottom-0 z-50 bg-stone-950 px-4 py-3 text-center text-sm font-semibold text-stone-50"
			data-testid="memory-warning"
		>
			{t('memoryWarning')}
		</div>
	{/if}
{:else}
	<div class="flex min-h-dvh items-center justify-center">
		<p class="text-sm font-semibold tracking-widest text-stone-400 uppercase">
			{t('loading')}
		</p>
	</div>
{/if}
