// Etch service worker（Kit 3 规范：$service-worker 已移除，改用 $app/manifest 等）。
//
// 策略（对应 ADR-0002「断网可用」）：
//  - 导航请求：network-first，失败回退缓存的 '/' —— 新部署能立刻生效，断网仍可开。
//  - immutable 构建产物（内容寻址、哈希命名）：cache-first，永不过期。
//  - 其它同源 GET：cache-first + 后台刷新。
//
// 反例（曾经踩过）：导航也走 cache-first，旧 HTML 永远不更新，重新部署后页面引用
// 已被删除的旧哈希 chunk，整站 404 —— 离线能力换来永久陈旧，不可接受。

import { self } from '$app/service-worker';
import { version } from '$app/env';
import { immutable, assets } from '$app/manifest';
import { resolve } from '$app/paths';

const CACHE = `etch-${version}`;
const FALLBACK = resolve('/');

const IMMUTABLE = new Set(immutable.map((asset) => resolve(asset.path)));
const PRECACHE = [
	...IMMUTABLE, // Vite 构建产物
	...assets.map((asset) => resolve(asset.path)), // static/ 下的所有文件
	FALLBACK
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);
			await cache.addAll(PRECACHE);
			await self.skipWaiting();
		})()
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key !== CACHE) await caches.delete(key);
			}
			await self.clients.claim();
		})()
	);
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	const url = new URL(event.request.url);
	if (url.origin !== self.location.origin) return;

	// 导航：network-first，断网才用缓存（否则新部署永远进不来）
	if (event.request.mode === 'navigate') {
		event.respondWith(
			(async () => {
				try {
					const response = await fetch(event.request);
					const cache = await caches.open(CACHE);
					cache.put(FALLBACK, response.clone());
					return response;
				} catch {
					const cache = await caches.open(CACHE);
					const cached = (await cache.match(event.request)) ?? (await cache.match(FALLBACK));
					if (cached) return cached;
					throw new Error('offline and no cached fallback');
				}
			})()
		);
		return;
	}

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			const cached = await cache.match(event.request);
			// 内容寻址的构建产物：命中即用，不必回源
			if (cached && IMMUTABLE.has(url.pathname)) return cached;

			try {
				const response = await fetch(event.request);
				if (response.ok) cache.put(event.request, response.clone());
				return response;
			} catch {
				if (cached) return cached;
				throw new Error('offline and not cached');
			}
		})()
	);
});
