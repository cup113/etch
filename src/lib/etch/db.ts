// IndexedDB 持久化（ADR-0002）。IDB 不可用时上层退化为内存模式（"临时碑"）。

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Game, Player } from './types';

interface EtchSchema extends DBSchema {
	games: { key: string; value: Game };
	roster: { key: string; value: Player };
	settings: { key: string; value: unknown };
}

const DB_NAME = 'etch';
const DB_VERSION = 1;

export type EtchDb = IDBPDatabase<EtchSchema>;

let dbPromise: Promise<EtchDb | null> | null = null;

export function openEtchDb(): Promise<EtchDb | null> {
	if (!dbPromise) {
		dbPromise = (async () => {
			if (typeof indexedDB === 'undefined') return null;
			try {
				return await openDB<EtchSchema>(DB_NAME, DB_VERSION, {
					upgrade(db) {
						if (!db.objectStoreNames.contains('games'))
							db.createObjectStore('games', { keyPath: 'id' });
						if (!db.objectStoreNames.contains('roster')) {
							db.createObjectStore('roster', { keyPath: 'id' });
						}
						if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
					}
				});
			} catch {
				return null;
			}
		})();
	}
	return dbPromise;
}

export async function loadGames(): Promise<Game[] | null> {
	const db = await openEtchDb();
	if (!db) return null;
	const all = await db.getAll('games');
	return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function putGame(game: Game): Promise<void> {
	const db = await openEtchDb();
	if (!db) return;
	await db.put('games', game);
}

export async function deleteGame(id: string): Promise<void> {
	const db = await openEtchDb();
	if (!db) return;
	await db.delete('games', id);
}

export async function loadRoster(): Promise<Player[] | null> {
	const db = await openEtchDb();
	if (!db) return null;
	const all = await db.getAll('roster');
	return all.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
}

export async function putPlayer(player: Player): Promise<void> {
	const db = await openEtchDb();
	if (!db) return;
	await db.put('roster', player);
}

export async function getSetting<T>(key: string): Promise<T | null> {
	const db = await openEtchDb();
	if (!db) return null;
	return ((await db.get('settings', key)) as T | undefined) ?? null;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
	const db = await openEtchDb();
	if (!db) return;
	await db.put('settings', value, key);
}
