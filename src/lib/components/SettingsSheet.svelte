<script lang="ts">
	// 设置：语言（zh/en）与触感。就地生效并持久化。
	import { t, setLang, currentLang } from '../i18n/i18n.svelte';
	import { hapticsEnabled, setHaptics } from '../etch/settings.svelte';

	let { onclose }: { onclose: () => void } = $props();

	let haptics = $state(hapticsEnabled());

	function switchLang(lang: 'zh' | 'en'): void {
		void setLang(lang);
	}
</script>

<div class="fixed inset-0 z-40 flex items-end bg-stone-950/40" role="presentation">
	<button
		type="button"
		class="absolute inset-0"
		aria-label={t('close')}
		onclick={onclose}
		data-testid="settings-backdrop"
	></button>
	<div class="relative w-full rounded-t-xl border-t-2 border-stone-900 bg-stone-100 p-5 pb-8">
		<h2 class="text-lg font-black text-stone-950">{t('settings')}</h2>

		<div class="mt-4">
			<div class="text-xs font-bold tracking-wider text-stone-500 uppercase">{t('language')}</div>
			<div class="mt-2 flex gap-2">
				<button
					type="button"
					class="etch-chip {currentLang() === 'zh' ? 'etch-chip-on' : ''}"
					onclick={() => switchLang('zh')}
					data-testid="lang-zh"
				>
					中文
				</button>
				<button
					type="button"
					class="etch-chip {currentLang() === 'en' ? 'etch-chip-on' : ''}"
					onclick={() => switchLang('en')}
					data-testid="lang-en"
				>
					English
				</button>
			</div>
		</div>

		<label class="mt-4 flex items-center justify-between">
			<span class="text-sm font-semibold text-stone-800">{t('haptics')}</span>
			<input
				type="checkbox"
				bind:checked={haptics}
				onchange={() => void setHaptics(haptics)}
				class="h-5 w-5 rounded border-stone-400"
				data-testid="haptics-toggle"
			/>
		</label>

		<button type="button" class="etch-btn mt-6" onclick={onclose} data-testid="settings-close">
			{t('close')}
		</button>
	</div>
</div>
