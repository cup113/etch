<script lang="ts">
	// 信息图标：标签只留结论，说明浮在页面上（fixed 定位）——不进文档流、不推挤任何一行。
	// 点图标开关；点面板外、按 Esc、滚动或改窗口大小即收起。
	// 换算与对照一律用 table 传入（表格比一段话好扫）；两行以内能说完的才用 text。
	let {
		label,
		testid,
		text,
		table
	}: {
		label: string;
		testid: string;
		text?: string;
		table?: { head: string[]; rows: string[][]; note?: string };
	} = $props();

	let open = $state(false);
	let button = $state<HTMLButtonElement | null>(null);
	let panel = $state<HTMLDivElement | null>(null);
	/** 面板的固定定位：先渲染成不可见，量到尺寸后再落位，避免闪一下 */
	let position = $state('');

	const GAP = 6;
	const MARGIN = 8;
	// position:fixed 写在内联样式里而不是只靠 class：出流是组件契约，不该取决于样式表是否加载
	const BASE_STYLE = 'position:fixed;';

	function place(): void {
		if (!button || !panel) return;
		const anchor = button.getBoundingClientRect();
		const box = panel.getBoundingClientRect();
		const vw = document.documentElement.clientWidth;
		const vh = window.innerHeight;
		const left = Math.min(
			Math.max(MARGIN, anchor.left + anchor.width / 2 - box.width / 2),
			Math.max(MARGIN, vw - MARGIN - box.width)
		);
		// 下方放不下就翻到图标上方
		const below = anchor.bottom + GAP;
		const top =
			below + box.height <= vh - MARGIN ? below : Math.max(MARGIN, anchor.top - GAP - box.height);
		position = `${BASE_STYLE}top:${Math.round(top)}px;left:${Math.round(left)}px`;
	}

	$effect(() => {
		if (open && panel) place();
	});

	$effect(() => {
		if (!open) return;
		const onPointer = (event: PointerEvent) => {
			const target = event.target as Node;
			if (button?.contains(target) || panel?.contains(target)) return;
			open = false;
		};
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') open = false;
		};
		const dismiss = () => (open = false);
		document.addEventListener('pointerdown', onPointer);
		document.addEventListener('keydown', onKey);
		window.addEventListener('scroll', dismiss, true);
		window.addEventListener('resize', dismiss);
		return () => {
			document.removeEventListener('pointerdown', onPointer);
			document.removeEventListener('keydown', onKey);
			window.removeEventListener('scroll', dismiss, true);
			window.removeEventListener('resize', dismiss);
		};
	});
</script>

<button
	bind:this={button}
	type="button"
	class="leading-none text-stone-400 active:text-stone-700 {open ? 'text-stone-800' : ''}"
	aria-label={label}
	aria-expanded={open}
	onclick={() => (open = !open)}
	data-testid="info-{testid}"
>
	ⓘ
</button>

{#if open}
	<div
		bind:this={panel}
		class="fixed z-50 max-h-[70vh] w-80 max-w-[calc(100vw-1rem)] overflow-auto rounded-md border
			border-stone-300 bg-white p-3 shadow-lg"
		style={position || `${BASE_STYLE}top:0;left:0;visibility:hidden`}
		role="note"
		aria-label={label}
		data-testid="info-panel-{testid}"
	>
		{#if table}
			<table class="w-full border-collapse text-left text-xs">
				<thead>
					<tr>
						{#each table.head as cell (cell)}
							<th class="border-b border-stone-400 py-1 pr-2 font-bold text-stone-500">{cell}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each table.rows as row, r (r)}
						<tr>
							{#each row as cell, i (i)}
								<td
									class="border-b border-stone-200 py-1 pr-2 {i === 0
										? 'whitespace-nowrap text-stone-600'
										: 'font-semibold text-stone-900 tabular'}"
								>
									{cell}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
			{#if table.note}
				<p class="mt-2 text-xs leading-relaxed text-stone-500">{table.note}</p>
			{/if}
		{:else if text}
			<p class="text-xs leading-relaxed whitespace-pre-line text-stone-600">{text}</p>
		{/if}
	</div>
{/if}
