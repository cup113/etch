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

	// 模板（首页卡片只留名字：说明属于开碑页与信息图标，详见 UI 准则「可见文案是成本」）
	tplGeneric: { zh: '通用', en: 'Generic' },
	tplDoudizhu: { zh: '斗地主', en: 'Dou Dizhu' },
	tplUno: { zh: 'UNO', en: 'UNO' },
	tplGuandan: { zh: '掼蛋', en: 'Guandan' },
	tplCabo: { zh: 'CABO', en: 'CABO' },
	tplShuangsheng: { zh: '双升', en: 'Shuangsheng' },

	// 开碑
	variant: { zh: '变体', en: 'Variant' },
	unoModeRace: { zh: '计分制', en: 'Race' },
	unoModeElimination: { zh: '出局制', en: 'Elimination' },
	targetScore: { zh: '目标分', en: 'Target score' },
	eliminateAt: { zh: '出局线', en: 'Elimination line' },
	levelsAtSecond: { zh: '头游 + 二游（双下）', en: '1st + 2nd (double down)' },
	levelsAtThird: { zh: '头游 + 三游（单下）', en: '1st + 3rd' },
	levelsAt80: { zh: '80 分（上台）闲家升级', en: 'Defender levels at 80' },
	levelsAt80None: { zh: '0 级 · 只换庄', en: '0 · takeover only' },
	levelsAt80One: { zh: '1 级 · 上台占一级', en: '1 · takeover counts' },
	defenderCap: { zh: '闲家封顶', en: 'Defender cap' },
	capNone: { zh: '不封顶', en: 'No cap' },
	capAt160: { zh: '封在 160 档', en: 'Cap at 160' },
	capAt200: { zh: '封在 200 档', en: 'Cap at 200' },
	grandWinBonus: { zh: '大光奖励（0 分升 4）', en: 'Shutout bonus (0 pts → 4)' },
	allowRollback: { zh: '允许倒级（抠底回退）', en: 'Allow rollback (dig-back)' },
	firstDeclarer: { zh: '首庄', en: 'First declarer' },
	caboThreshold: { zh: '终局线', en: 'Game ends at' },
	tabletNamePlaceholder: { zh: '碑名（可选）', en: 'Name (optional)' },
	renameTablet: { zh: '改名', en: 'Rename' },
	players: { zh: '玩家', en: 'Players' },
	playerPlaceholder: { zh: '输入名字，回车加入', en: 'Type a name, press Enter' },
	needPlayers: { zh: '至少 {n} 人', en: 'At least {n} players' },
	tooManyPlayers: { zh: '至多 {n} 人', en: 'At most {n} players' },
	teamLabel: { zh: '{n} 队', en: 'Team {n}' },
	seatHint: {
		zh: '按座位顺序添加。',
		en: 'Add in seating order.'
	},
	seatTeamsHint: {
		zh: '按座位顺序添加；1、3 号一队，2、4 号一队。',
		en: 'Add in seating order; seats 1 & 3 team up, 2 & 4 team up.'
	},
	startTablet: { zh: '开碑', en: 'Start' },

	// 变体说明（信息图标内文）：标签只留结论；换算与对照一律用表格，一句话能说清的才写字
	infoUnoMode: { zh: '玩法', en: 'Modes' },
	colMode: { zh: '玩法', en: 'Mode' },
	colScoringEnd: { zh: '记分与终局', en: 'Scores & ends' },
	unoRaceCell: {
		zh: '赢家收全场剩牌点；先到目标分（默认 500）胜',
		en: 'Winner takes all leftovers; first to target (500) wins'
	},
	unoEliminationCell: {
		zh: '各记自己剩牌点；到线（默认 300）出局，最后一人胜',
		en: 'Each scores their own; crossing 300 is out, last one wins'
	},
	unoExample: {
		zh: '例：乙剩 30、丙剩 12 → 计分制甲 +42；出局制乙 +30、丙 +12。',
		en: 'E.g. B has 30 left, C 12 → race A +42; elimination B +30, C +12.'
	},

	infoGuandanRanks: { zh: '同伴名次与进级', en: 'Partner finish and levels' },
	colPartnerFinish: { zh: '头游同伴', en: 'Partner of 1st' },
	colLevels: { zh: '进级', en: 'Levels' },
	guandanNote: {
		zh: '数字可在开碑页改；级牌 2 → A，过 A 封顶。',
		en: 'Editable here; levels run 2 → A.'
	},

	infoCaboThreshold: { zh: '终局线', en: 'Game-end line' },
	colWho: { zh: '谁', en: 'Who' },
	colPoints: { zh: '记分', en: 'Scores' },
	caboWhoCaller: { zh: '出完牌或叫 Cabo', en: 'Went out or called Cabo' },
	caboWhoOthers: { zh: '其余人', en: 'Everyone else' },
	caboPointsOwn: { zh: '手中剩牌点', en: 'Leftover points' },
	caboNote: {
		zh: '有人到线（默认 100）→ 当前最低分者胜。',
		en: 'Someone hits the line (100) → lowest score wins.'
	},

	infoLevelsAt80: { zh: '80 分升级数', en: 'Levels at 80' },
	colDefenderScore: { zh: '闲家得分', en: 'Defenders' },
	levelsAt80Pick0: { zh: '选 0', en: 'Pick 0' },
	levelsAt80Pick1: { zh: '选 1', en: 'Pick 1' },
	levelsAt80Note: { zh: '不封顶时；每多 40 分再 +1 级。', en: 'Uncapped; +1 per extra 40.' },

	infoDefenderCap: { zh: '闲家封顶', en: 'Defender cap' },
	colCap: { zh: '档位', en: 'Cap' },
	colLimit: { zh: '上限', en: 'Ceiling' },
	capNoLimit: { zh: '不设限', en: 'No ceiling' },
	capCeiling2: { zh: '80 分升级数 +2', en: 'Levels at 80 + 2' },
	capCeiling3: { zh: '80 分升级数 +3', en: 'Levels at 80 + 3' },

	infoGrandWinBonus: { zh: '大光奖励', en: 'Shutout bonus' },
	grandWinBonusHelp: {
		zh: '闲家 0 分＝大光：庄家默认升 3 级，开启后升 4 级。',
		en: 'Defenders on 0 = shutout: declarers +3, or +4 with this on.'
	},
	infoAllowRollback: { zh: '允许倒级', en: 'Allow rollback' },
	allowRollbackHelp: {
		zh: '抠底房规，默认关。开启后刻入表单出现「回退」：选队、选回到第几级，差值并入同一笔。\n例：打 J 被副 J 抠底 → 回到 5。',
		en: 'Rare house rule, off by default. On, the etch form gains a rollback: pick team and level; the difference lands in the same mark.\nE.g. playing J, dug back by a trump J → back to 5.'
	},
	infoFirstDeclarer: { zh: '首庄', en: 'First declarer' },
	firstDeclarerHelp: {
		zh: '1、3 号座一队，2、4 号另一队。之后 ≥80 分换庄、<80 分连庄。',
		en: 'Seats 1 & 3 vs 2 & 4. Then 80+ takes over, under 80 holds.'
	},

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
	proclCaboFinished: {
		zh: '终局：{name} 以最低分获胜（有人到 {threshold}）',
		en: 'Game over: {name} wins lowest (someone hit {threshold})'
	},
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
	partnerRank: { zh: '同伴名次', en: "Partner's finish" },
	rankSecond: { zh: '二游（双下）', en: '2nd (double down)' },
	rankThird: { zh: '三游（单下）', en: '3rd (single down)' },
	rankLast: { zh: '末游', en: 'Last' },
	declarer: { zh: '本局庄家', en: 'Declarer' },
	defendersScore: { zh: '闲家得分', en: "Defenders' score" },
	previewDeclarerUp: { zh: '庄家升 {n} 级', en: 'Declarers up {n} level(s)' },
	previewTakeover: { zh: '闲家上台，升 {n} 级', en: 'Defenders take over, up {n} level(s)' },
	previewTakeoverNoGain: { zh: '闲家上台，只换庄', en: 'Defenders take over, no levels' },
	rollbackToggle: { zh: '回退（抠底）', en: 'Rollback (dig-back)' },
	rollbackTeam: { zh: '哪队回退', en: 'Which team rolls back' },
	rollbackTo: { zh: '回到', en: 'Back to' },
	caboCaller: { zh: '本轮叫牌 / 出完', en: 'Called Cabo / went out' },
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
