// 通用模板：纯手工账。任意整数笔（可正可负），无终局检测。

import type { Template } from './index';

export const generic: Template<{ kind: 'generic' }> = {
	id: 'generic',
	names: { zh: '通用', en: 'Generic' },
	minPlayers: 1,
	maxPlayers: 12,
	defaultVariant: { kind: 'generic' }
};
