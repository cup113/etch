// 轻量双语字典（决策 7：不引重型 i18n 框架）。键即契约：删键必须在全库 grep。

export type Lang = 'zh' | 'en';

export type DictEntry = Record<Lang, string>;

export const dict = {
	appName: { zh: 'Etch', en: 'Etch' },
	subtitle: { zh: '刻上去，就不消失。', en: 'Scores that never vanish.' },

	// 全局
	settings: { zh: '设置', en: 'Settings' },
	language: { zh: '语言', en: 'Language' },
	haptics: { zh: '触感反馈', en: 'Haptics' },
	cancel: { zh: '取消', en: 'Cancel' },
	confirm: { zh: '确定', en: 'Confirm' },
	close: { zh: '收起', en: 'Close' },
	back: { zh: '返回', en: 'Back' },
	loading: { zh: '读碑中…', en: 'Reading the tablet…' },
	memoryWarning: {
		zh: '临时碑：当前环境无法持久保存，关闭页面后数据将丢失。',
		en: 'Temporary tablet: storage is unavailable here; data will be lost when the page closes.'
	},

	// 首页
	newTablet: { zh: '开新碑', en: 'New tablet' },
	history: { zh: '碑林', en: 'History' },
	emptyHistory: {
		zh: '还没有碑。开一局，刻下第一笔。',
		en: 'No tablets yet. Start a game and make the first mark.'
	},
	playersCount: { zh: '{n} 人', en: '{n} players' },
	entriesCount: { zh: '{n} 笔', en: '{n} marks' },

	// 模板
	tplGeneric: { zh: '通用', en: 'Generic' },
	tplGenericDesc: { zh: '想记什么记什么', en: 'Any game, any number' },
	tplDoudizhu: { zh: '斗地主', en: 'Dou Dizhu' },
	tplDoudizhuDesc: { zh: '底分 × 倍数，地主双份', en: 'Base × multiplier, landlord pays double' },
	tplUno: { zh: 'UNO', en: 'UNO' },
	tplUnoDesc: { zh: '剩牌计点，两种变体', en: 'Count leftover cards, two variants' },
	tplGuandan: { zh: '掼蛋', en: 'Guandan' },
	tplGuandanDesc: { zh: '两队爬级，过 A 封顶', en: 'Two teams climb levels to A' },

	// 开碑
	variant: { zh: '变体', en: 'Variant' },
	unoModeRace: {
		zh: '计分制 · 赢家收点，先到目标分',
		en: 'Race · winner takes points, first to target'
	},
	unoModeElimination: {
		zh: '出局制 · 各吃各的分，触线出局',
		en: 'Elimination · eat your own points, cross and you are out'
	},
	targetScore: { zh: '目标分', en: 'Target score' },
	eliminateAt: { zh: '出局线', en: 'Elimination line' },
	doubleDownLevels: { zh: '双下进级数', en: 'Levels per double-down' },
	players: { zh: '玩家', en: 'Players' },
	playerPlaceholder: { zh: '输入名字，回车加入', en: 'Type a name, press Enter' },
	seatHint: {
		zh: '按座位顺序添加；掼蛋 1、3 号一队，2、4 号一队。',
		en: 'Add in seating order; Guandan seats 1 & 3 team up, 2 & 4 team up.'
	},
	needPlayers: { zh: '至少 {n} 人', en: 'At least {n} players' },
	tooManyPlayers: { zh: '至多 {n} 人', en: 'At most {n} players' },
	teamLabel: { zh: '{n} 队', en: 'Team {n}' },
	startTablet: { zh: '开碑', en: 'Start' },

	// 碑面
	etchNow: { zh: '刻', en: 'Etch' },
	markNo: { zh: '第 {n} 刻', en: 'Mark {n}' },
	manualEntry: { zh: '手工', en: 'Manual' },
	chiseledLabel: { zh: '已凿除', en: 'Chiseled off' },
	chiselAction: { zh: '凿除', en: 'Chisel off' },
	chiselEntryRow: { zh: '凿 · 第 {n} 刻', en: 'Chisel · mark {n}' },
	chiselConfirm: {
		zh: '凿掉这一笔？它将划掉显示、不再计分，但永远留在碑上。',
		en: 'Chisel off this mark? It shows struck-through and stops counting — but it stays on the tablet forever.'
	},
	proclRaceWon: { zh: '{name} 到达 {threshold} 分', en: '{name} reached {threshold}' },
	proclEliminated: { zh: '{name} 出局（{threshold} 分）', en: '{name} is out ({threshold})' },
	proclLastStanding: { zh: '只剩 {name} 未触线', en: '{name} is the last one standing' },
	proclLevelCapped: { zh: '{name} 过 A', en: "{name}'s team passed A" },
	proclTitle: { zh: '宣告', en: 'Declared' },

	// 刻入表单
	amount: { zh: '数值', en: 'Amount' },
	toWhom: { zh: '给谁', en: 'To whom' },
	landlord: { zh: '地主', en: 'Landlord' },
	landlordWin: { zh: '地主胜', en: 'Landlord wins' },
	farmersWin: { zh: '农民胜', en: 'Farmers win' },
	base: { zh: '底分', en: 'Base' },
	multiplier: { zh: '倍数', en: 'Multiplier' },
	roundWinner: { zh: '本局出完牌', en: 'Went out this round' },
	remainders: { zh: '剩牌点数', en: 'Cards left (points)' },
	winningTeam: { zh: '胜队', en: 'Winning team' },
	doubleDown: { zh: '双下', en: 'Double down' },
	checkInput: { zh: '检查一下输入。', en: 'Check the input.' },
	errLedger: { zh: '账本拒绝了这笔：{reason}', en: 'The ledger refused this mark: {reason}' },

	// 碑务
	tabletMenu: { zh: '碑务', en: 'Tablet' },
	exportRubbing: { zh: '导出拓片', en: 'Export rubbing' },
	importRubbing: { zh: '导入拓片', en: 'Import rubbing' },
	importOk: { zh: '拓片已恢复为碑。', en: 'Rubbing restored as a tablet.' },
	importFail: { zh: '拓片无法读取：{reason}', en: 'Cannot read the rubbing: {reason}' },
	eraseTablet: { zh: '磨碑（整碑销毁）', en: 'Erase tablet (permanent)' },
	eraseConfirm: {
		zh: '磨碑将销毁这块碑的全部历史，无法恢复。已导出的拓片不受影响。确定？',
		en: 'Erasing destroys this tablet’s entire history permanently. Exported rubbings survive. Are you sure?'
	}
} satisfies Record<string, DictEntry>;

export type DictKey = keyof typeof dict;
