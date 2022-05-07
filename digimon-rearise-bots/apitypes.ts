type int = number
type long = number
type float = number
export const enum OsType {
	iOS = 1,
	Android = 2,
}
export const enum PlatformType {
	AppStore = 1,
	PlayStore = 2,
}
export const enum LanguageCodeType {
	// our extension:
	Ja = 0,
	// used in global client app:
	// Other = 0,
	En = 1,
	Ko = 2,
	Zh = 3,
}
export const enum VoiceLanguageType {
	None = 0,
	En = 1,
	Jpn = 2,
}
export const enum QuestType {
	Adventure = 1,
	Weekly = 2,
	Underworld = 3,
	DFQ = 4,
	Ec = 5,
	Mpr = 6,
}
export interface BattleDigimonDetailPluginInfo {
	slotId: int
	userPluginId: int
	pluginId: int
	strengtheningValue: int
}
export interface BattleDigimonDetail {
	userDigimonId: int
	digimonId: int
	awakingLevel: int
	generation: int
	level: int
	friendshipPoint: int
	friendshipLevel: int
	moodValue: int
	skillLevel: int
	executionLimitbreakId: int
	completeTrainingIds: int[]
	lastBrokenSlbNecessaryLevel: int
	wearingPluginList: BattleDigimonDetailPluginInfo[]
	hp: int
	attack: int
	defense: int
	speed: int
}
export interface BattleLogParameterInfo {
	userDigimonId: int
	parameterHash: string
	parameterRaw: ''
	battleDigimonDetail: BattleDigimonDetail
}
export interface SkillInfo {
	skillId: int
	strength: int
	type: int
	influenceData: string
}
export interface AttackedDigimonInfo {
	userDigimonId: int
	isFriendshipSkill: boolean
	isBPBuff: boolean
	isSlayerBuff: boolean
	isIgnoreDefense: boolean
	actionId: int
	buff: SkillInfo[]
	debuff: SkillInfo[]
	defense: int
	hp: int
	totalCorrectionValue: int
}
export interface TargetDigimonInfo {
	digimonId: int
	isBPBuff: boolean
	buff: SkillInfo[]
	debuff: SkillInfo[]
	defense: int
	hp: int
}
export interface BattleLogInfo {
	historyId: int
	maxDamage: int
	maxDamageFormula: string
	digimonParameterList: BattleLogParameterInfo[]
	partnerDigimonParameter: BattleLogParameterInfo
	helperDigimonParameter: BattleLogParameterInfo
	attackedDigimonInfo: AttackedDigimonInfo
	targetDigimonInfo: TargetDigimonInfo
	totalDamage: int
}
export interface GridInfo {
	x: int
	y: int
	rotationType: int
}
export interface UserDeco {
	userDecoId: number
	decoId: number
	gridInfo: GridInfo
}
export interface WearingPlugin {
	slotId: int
	userPluginId: int
	isLocked: boolean
}
export interface UserDigimon {
	userDigimonId: int
	digimonId: int
	isLocked: boolean
	isEcLocked: boolean
	bit: int
	level: int
	maxLevel: int
	friendshipPoint: int
	// friendshipLevel?: int  // absent from class, present in *some* API responses
	maxFriendshipLevel: int
	moodValue: float  // but API only ever uses exact-integer values from 0.0 to 100.0
	skillLevel: int
	executionLimitbreakId: int
	completeTrainingIds: int[]
	wearingPluginList: WearingPlugin[]
	addFriendshipPointByPeriod: int
	lastCareTime: string
	lastBrokenSlbNecessaryLevel: int
	awakingLevel: int
}
export interface UserHatchingCapsule {
	userHatchingCapsuleId: number
	userDigimonId: number
	itemId: number
	level: number
	requiredNextBit: number
	endCoolingDate: string
	nextDemandTime?: string
	trademarkId?: number
}
export interface UserPersonal {
	userId: number
	level?: number  // absent from class, present in actual user/getAll API response
	name: string
	exp: number
	stamina: number
	staminaMax: number
	staminaChangeTime: string
	partnerDigimonId: number
	digimonMaxCount: number
	pluginMaxCount: number
	decoMaxCount: number
	freeDigiruby: number
	paidDigiruby: number
	friendCode: string
	addFriendMaxNum: number
	birthday?: string  // declared (even in Japan) but absent from actual API responses (even global)
}
export interface UserPlugin {
	userPluginId: number
	pluginId: number
	strengtheningValue: number
	strengtheningPoint: number
	isLocked: boolean
	isEcLocked: boolean
}
export const enum PrizeType {
	Item = 0,
	Digimon = 1,
	Plugin = 2,
	Deco = 3,
}
export interface PresentDecoInfo {
	decoId: int
	count: int
}
export interface PresentDigimon {
	digimonId: int
	level: int
	maxLevel: int
	friendshipLevel: int
	maxFriendshipLevel: int
	skillLevel: int
	executionLimitbreakId: int
	completeTrainingIds: int[]
}
export interface PresentItemInfo {
	itemId: int
	count: int
}
export interface PresentPluginInfo {
	pluginId: int
	strengtheningValue: int
}
export interface Present {
	userPresentId: int
	prizeType: PrizeType  // declared as int
	description: string
	receiptDate: string
	itemInfo?: PresentItemInfo
	digimonInfo?: PresentDigimon
	pluginInfo?: PresentPluginInfo
	decoInfo?: PresentDecoInfo
}
export interface UserPresentLog {
	userPresentId: number
	prizeType: PrizeType
	id: number
	count: number
	description: string
	receiveDate: string
	digimonInfo: PresentDigimon
	pluginInfo: PresentPluginInfo
	decoInfo: PresentDecoInfo
}
export interface UserScrounge {
	userDigimonId: number
	scroungeId: number
	endTime: string
}
export const enum QuestPlayState {
	New = 0,
	Open = 1,
	Clear = 2,
}
export interface UserQuest {
	questId: int
	playState: QuestPlayState
	clearedEvaluationIdList: int[]
}
export interface UserBattlePark {
	bpStamina: number
	bpChangeTime: string
}
export interface UserDigiconne {
	lastObtainItemStep: number
	lastObtainItemDate: string
	lastPassingItemStep: number
	lastPassingItemDate: string
	digiconneItemId: number
}
export interface UserItem {
	itemId: number
	count: number
}
export interface UserResumeQuest {
	questHistoryId?: int
	battleParkHistoryId?: int
}
export interface UserTeam {
	teamId: number
	userDigimonList: number[]
}
export interface UserUnderworld {
	underworldId: number
	floor: number
	playState: QuestPlayState
}
export interface UserUnlockedWeeklySection {
	sectionId: number
	closeDate: string
}
export const enum BackupType {
	Invalid = 0,
	Password = 1,
	Facebook = 2,
	Twitter = 3,
	Apple = 4,
}
export const enum BattleParkTutorialState {
	NotStart = 0,
	Start = 10,
	Induction = 20,
	Progress = 30,
	Reward = 40,
	End = 999,
}
export const enum BP2TutorialState {
	NotStart = 0,
	Start = 10,
	Induction = 20,
	Unlock = 30,
	Welcome = 40,
	TeamEdit = 45,
	Battle1 = 50,
	Battle2 = 60,
	Explanation = 70,
	End = 999,
}
export const enum CommonTutorialState {
	NotStart = 0,
	Start = 10,
	Progress = 20,
	End = 999,
}
export const enum DigitamaTutorialState {
	NotStart = 0,
	Start = 10,
	DigitamaDescription = 20,
	Hatch = 30,
	ChildhoodDescription = 40,
	End = 999,
}
export const enum EcTutorialState {
	NotStart = 0,
	Start = 10,
	Opening = 20,
	Guidance = 30,
	End = 999,
}
export const enum FirstTutorialState {
	Prologue = 10,
	Scenario1 = 11,
	BattleBaseIntroduction = 12,
	Scenario2 = 20,
	Scenario3 = 30,
	DropAndAutoIntroduction = 31,
	Scenario4 = 40,
	Scenario5 = 50,
	BossBattle = 51,
	BattleAfterScenario = 52,
	DownLoadConfirm = 70,
	Download = 71,
	Home = 80,
	Reinforcement = 90,
	Gasha = 110,
	TeamEdit = 120,
	MissionFirstTutorialClear = 130,
	MissionDescription = 131,
	LastMessage = 777,
	End = 999,
}
export const enum PartnerTutorialState {
	NotStart = 0,
	Start = 10,
	SelectPartnerDescription = 20,
	End = 999,
}
export namespace TutorialData {
	export const TutorialFinishMissionId = 316000
	export const DropItemBoxDefaultAsset = 'dropitem_blue'  // declared private; maybe unnecessary here?
}
export const enum TutorialType {
	Empty = 0,
	FirstTutorial = 100,
	FunctionalTutorialOfPluginSet = 200,
	FunctionalTutorialOfPluginStrengthen = 201,
	FunctionalTutorialOfSkillLevelup = 202,
	FunctionalTutorialOfEvolve = 203,
	FunctionalTutorialOfDigitama = 204,
	FunctionalTutorialOfDeco = 206,
	FunctionalTutorialOfDecoIntroduction = 208,
	FunctionalTutorialOfLimitBreakIntroduction = 209,
	FunctionalTutorialOfWidgetIntroduction = 210,
	FunctionalTutorialOfPluginSetIntroduction = 211,
	FunctionalTutorialOfSkillLevelUpIntroduction = 212,
	FunctionalTutorialOfBattleParkIntroduction = 213,
	FunctionalTutorialOfFirstQuestIntroduction = 214,
	FunctionalTutorialOfRaidCatalog = 215,
	FunctionalTutorialOfHomeDigimonSet = 300,
	FunctionalTutorialOfWeeklyQuest = 301,
	FunctionalTutorialOfRaid = 302,
	FunctionalTutorialOfBattlePark = 303,
	FunctionalTutorialOfPartnerSelect = 304,
	FunctionalTutorialOfClan = 305,
	FunctionalTutorialOfUnderworld = 306,
	FunctionReleaseTutorialOfTraining = 307,
	FunctionReleaseTutorialOfDigiconne = 308,
	FunctionReleaseTutorialOfBP2 = 309,
	FunctionReleaseTutorialOfEc = 310,
}
export interface TutorialInfo {
	tutorialType: TutorialType
	tutorialState: (BattleParkTutorialState | BP2TutorialState | CommonTutorialState
	              | DigitamaTutorialState | EcTutorialState | FirstTutorialState | PartnerTutorialState)
}
export interface UserData {
	// These are present in class and in a 2020-04-20 API response but not in a 2022-04-10 API response
	lastSelectedTeamId?: number
	userScroungeList?: UserScrounge[]
	_getScroungeEndTime?: string
	personal: UserPersonal
	userDigimonList: UserDigimon[]
	userTeamList: UserTeam[]
	userQuestList: UserQuest[]
	homeDigimonList: number[]
	userDecoList: UserDeco[]
	userItemList: UserItem[]
	userPluginList: UserPlugin[]
	userDigiconne: UserDigiconne
	userHatchingCapsuleList: UserHatchingCapsule[]
	userResumeQuest: UserResumeQuest | []  // "obsolete"
	userUnlockedWeeklySectionList: UserUnlockedWeeklySection[]
	userPresentLogList: UserPresentLog[]
	userSocialPresentLogList: UserPresentLog[]
	assignedClanId: number
	userUnderworldList: UserUnderworld[]
	userBattlePark: UserBattlePark
	userReadScenarioIdList: number[]
	userTutorial?: TutorialInfo
	userEndTutorialTypeList: number[]
	digimonCodeList: string[]
	userBackupType: BackupType
	lastReviewBattleAppVersion: string
	userStartChallengeGroupIdList: number[]
}
export namespace UserData {
	export const ApplicationVersionZero = '0.0.0'
	export const HomeDigimonInstallationNum = 7
	export const EmptyUserId = -1
	export const EmptyHistoryId = -1
	export const CompletedLimitbreakId = 0
	export const EmptyClanId = -1
	export const MaxDisplayBPStamina = 5
	export const ClanUserHatchingCapsuleId = 2
	export const MinPluginStrengthen = 0
	export const EmptySectionId = 0
	export const EmptyQuestId = 0
	export const EmptyScenarioId = 0
	export const EmptyTeamId = 0
	export const DefaultTeamId = 1001
	export const DefaultBattleParkTeamId = 2001
	export const DefaultRaidTeamId = 3001
	export const DefaultDFQTeamId = 6001
	export const DefaultEcTeamId = 7001
	export const MaxTeamDigimonSlot = 5
	export const EmptyDigimonId = -1
	export const EmptyUserDigimonId = -1
	export const EmptyItemId = -1
	export const MaxMoodValue = 100
	export const MinSkillLevel = 1
	export const MinDigimonLevel = 1
	export const MaxDigimonLevel = 99
	export const SuperLimitbreakBorderLevel = 99
	export const MaxFriendshipLevel = 99
	export const MinEvolutionaryStage = 1
	export const EmptyUserPluginId = -1
	export const ItemIdBit = 22000
	export const ItemIdHardCurrency = 21000
	export const ItemIdCommuPoint = 22004
	export const ItemIdDrink = 20000
	export const ItemBPMedal = 22001
	export const ItemBpCoin = 22023
	export const ItemCBMedal = 22002
	export const ItemIdDigiOrb = 22007
	export const EcReverseItemId = 27001
	export const PresentLogCount = 200
	export const DefaultBattleParkRank = -1
	export const BetaUnderworldId = 0
	export const GrandOpenUnderworldId = 1
	export const EmptyChallengeGroupId = 0
	export const EmptyChallengeId = 0
	export const DefaultChallengeGroupRank = 1
	export const EmptyLastNecessaryLevel = 0
	export const EmptyStoryId = -1
	export const DefaultAwakingLevel = 0
	export const RequiredAwakeDigimonLevel = 99
	export const RequiredInheritanceDigimonLevel = 99
	export const MprEventQuestId = 1118029
}
export namespace GogglesConstants {
	export const DigimonAttackMax = 99999
	export const DigimonDefenseMax = 99999
	export const DigimonSpeedMax = 99999
	export const DigimonHpMax = 99999
	export const DigimonFriendshipLevelMax = 99
	export const CrisisHpRatio = 0.5
	export const DFQGuestDigimonSlotIndex = 4
	export const EmptyScenarioId = 0
	export const EmptyShopId = -1
	export const EmptyBattleId = 0
	export const EmptyUnderworldQuestId = 0
	export const EmptyPositionIndexId = -1
	export const EmptyBattleDigimonId = -1
	export const EmptyTrademarkId = 0
	export const EmptyReplaceBattleId = 0
	export const EmptyDFQEventId = 0
}
export const enum BattleStyle {
	None = 0,
	Quest = 1,
	BattlePark = 2,
	Raid = 3,
	WeeklyQuest = 4,
	Underworld = 5,
	DFQ = 6,
	Ec = 7,
	XLB = 8,
}
export interface BattleResume {
	battleStyle: BattleStyle
	historyId: number
}
export const enum InformationCategory {
	Event = 0,
	Gasha = 1,
	Campaign = 2,
	Important = 3,
	Update = 4,
	Maintenance = 5,
	Other = 6,
	MainStory = 7,
	Special = 8,
	Shop = 9,
}
export interface Information {
	informationId: int
	category: InformationCategory
	thumbnail: string
	title: string
	dispOrder: int
	pickupOrder: int
	isPickup: boolean
	startDate: string
	endDate: string
	modifiedDate: string
}
export interface LoginBonusInfo {
	asset: string
	endDate: string
	dispPriority: number
	isLoop: boolean
}
export interface LoginBonusPrizeInfo {
	prizeType: PrizeType
	prizeId: number
	prizeCount: number
	displayType: number
}
export interface PrizeInfo {
	prizeType: PrizeType  // declared as int
	itemId: int
	count: int
	userDigimon?: UserDigimon
	userPlugin?: UserPlugin
	userDeco?: UserDeco
}
export interface GashaEventResult {
	assetType: number
	prizeInfoList: PrizeInfo[]
}
export interface RaidEventBanner {
	bannerAsset: string
	extensionType: number
	extensionId: number
	extensionData: unknown
}
export interface RaidEventReward {
	requiredPoint: number
	reward: PrizeInfo
}
export interface RaidEventInSession {
	eventId: int
	bannerAsset: string
	isEnded: boolean
	canReceiveReward: boolean
	dispOrder: int
	bannerEndDate: string
	unreceivedRewardCount: int
	isEncount: boolean
	isRescue: boolean
}
export interface RaidInfo {
	raidId: int
	uniqueRaidId: int
	digimonId: int
	raidBossLevel: int
	hp: int
	defaultHp: int
	tamerName: string
	tamerLevel: int
	isClanMember: boolean
	relationshipType: FriendState
	startDate: string
	itemIdList: int[]
	isOverlapped: boolean
	eventId: int
	limitedItemId: int
	isCatalog: boolean
}
export interface DigimonDetailPluginInfo {
	slotId: int
	pluginId: int
	strengtheningValue: int
}
export interface DigimonDetail {
	// userId: int
	userDigimonId: int
	digimonId: int
	level: int
	maxLevel: int
	friendshipLevel: int
	maxFriendshipLevel: int
	moodValue: int
	skillLevel: int
	executionLimitbreakId: int
	completeTrainingIds: int[]
	lastBrokenSlbNecessaryLevel: int
	wearingPluginList: DigimonDetailPluginInfo[]
	lastCareTime: string
	awakingLevel: int
}
export interface RaidMember {
	userId: number
	tamerName: string
	tamerLevel: number
	relationshipType: FriendState
	isClanMember: boolean
	joinCount: number
	damage: number
	digimon: DigimonDetail
	greetings: string
	lastLogin: string
}
export interface ReceivedBonus {
	loginBonusId: number
	receivedIndex: number
	loginBonusInfo: LoginBonusInfo
	prizeInfoList: LoginBonusPrizeInfo[]
}
export interface ReloadPrizeInfo {
	shopId: int
	sequence: int
}
export interface ScenarioEventInSession {
	eventId: int
	bannerAsset: string
	topAsset: string
	dispOrder: int
	isUnlockableSection: boolean
	extensionId: int
	extensionData: unknown
	bannerEndDate: string
	canScenarioEventGasha: boolean
}
export interface LogObject {
	count: number
	isNew: boolean
	updatedAt: string
}
export interface SocialTopInfo {
	highPriorityBoardContentInfo: LogObject
	lowPriorityBoardContentInfo: LogObject
	friendLogInfo: LogObject
	clanLogInfo: LogObject
}
export interface SpecialMissionInfo {
	playingMissionId: number
}
export interface VisitorDigimonDetail {
	baseInfo: DigimonDetail
	friendshipPoint: number
}
export const enum FriendState {
	Other = 0,
	Friend = 1,
	Guest = 2,
	Requested = 3,
	Requesting = 4,
	Mine = 5,
}
export interface Visitor {
	userId: number
	tamerName: string
	tamerLevel: number
	relationshipType: FriendState
	isClanMember: boolean
	visitorDigimon: VisitorDigimonDetail
	isTalked: boolean
}
export interface PrizeSummary {
	prizeType: PrizeType
	prizeId: number
	prizeCount: number
}
export interface BceBanner {
	bannerAsset: string
	extensionType: number
	extensionId: number
	extensionData: unknown
}
export interface BceInSession {
	eventId: int
	bannerAsset: string
	dispOrder: int
	extensionId: int
	extensionData: unknown
	bannerEndDate: string
	unreceivedPrizeCount: int
}
export interface BcePrize {
	requiredPoint: number
	prize: PrizeSummary
}
export const enum BceQuestPlayState {
	Lock = 0,
	Playable = 1,
	Clear = 2,
	New = 3,
}
export interface BceQuest {
	questId: number
	difficultyTextId: number
	digimonId: number
	battleId: number
	userExp: number
	prizeList: PrizeSummary[]
	playState: BceQuestPlayState
	clearCount: number
	staminaCost: number
}
export interface BceInfo {
	eventId: number
	topAsset: string
	slayerId: number
	bannerList: BceBanner[]
	startDate: string
	playableEndDate: string
	endDate: string
	textIdJson: string
	teamIdList: number[]
	questGroupId: number
	questList: BceQuest[]
	totalEventPoint: number
	lastReceivedEventPoint: number
	shopId: number
	pointItemId: number
}
export interface MprInSession {
	mprId: int
	bannerAsset: string
	dispOrder: int
	extensionId: int
	extensionData: unknown
	bannerEndDate: string
}
export interface MprParticipateData {
	userName: string
	bossDigimonId: number
}
export interface MprPrizeInfo {
	prizeInfo: PrizeInfo
	actionAsset: string
}
export interface MprQuest {
	questId: number
	startDate: string
	bossTotalHp: number
	bossCurrentHp: number
	bossTotalDamage: number
	titleTextId: number
	staminaCost: number
	userExp: number
	gainFriendship: number
	battleId: number
	prizeList: PrizeSummary[]
}
export interface MprScenarioData {
	scenarioId: number
	digimonId: number
	healedHp: number
	prevHp: number
	changedHp: number
	changedAttack: number
	prevAttack: number
	changedDefense: number
	prevDefense: number
	isHealedHp: boolean
	isChangedHp: boolean
	isChangedAttack: boolean
	isChangedDefense: boolean
}
export namespace MprTop {
	export interface Response {
		startDate: string
		endDate: string
		mprQuestList: MprQuest[]
		playScenarioDataList: MprScenarioData[]
		participateUserList: MprParticipateData[]
	}
}
export interface HomeNotificationInfo {
	scenarioId: number
	notificationOrder: number
	dispOrder: number
}
export interface GdprConsentItem {
	itemType: number
	isAccepted?: boolean
	version: number
}
export const enum GdprItemType {
	AdTargeting = 1,
	Analytics = 2,
}
export interface GdprStatus {
	AdTargeting: number
	Analytics: number
}
export namespace AppStatus {
	export interface Request {
		userId: number
	}
	export interface Response {
		masterBaseUrl: string
		masterCacheKey: string
		resourceBaseUrl: string
		resourceCacheKey: string
		imageBaseUrl: string
		termsUrl: string
		termsVersion: number
		privacyPolicyUrl: string
		privacyPolicyVersion: number
		reviewUrl?: string
		updateType: number
		updateDate?: string
		updateMessage?: string
		gdprVersions?: GdprConsentItem[]  // global only
	}
}
export interface UserDeviceInfo {
	operatingSystem: string
	deviceModel: string
}
export namespace UserCreate {
	export interface JapanRequest {
		uuid: string
		name: string
		platformType: PlatformType  // declared as plain int
		currencyUnit: string
		uniqueDeviceId: string
		adId: string
		isDevelopmentMode: boolean
		isRoot: boolean
		validationCode: string
		deviceInfo: UserDeviceInfo
	}
	export interface GlobalRequest {
		uuid: string  // '6210a00a65ec423d801e94cf6e3804cc'
		name: string  // 'Cub Tamer'
		platformType: PlatformType  // declared as plain int
		countryCode: string  // 'GB'
		languageCode: string  // 'EN'
		timezoneOffset: string  // '09:00:00'
		voiceType: VoiceLanguageType
		uniqueDeviceId: string  // '5749021331371322'
		adId: string  // 'f5c8b10e-e85f-4131-8216-7710d807f4ff'
		isDevelopmentMode: boolean
		isRoot: boolean
		validationCode: string  // 'c8bd005b07b2ec904d2e26ff1f7bda57'
		deviceInfo: UserDeviceInfo
		consentFormItemData: GdprConsentItem[]  // [{"isAccepted":false,"itemType":1,"version":0},{"isAccepted":true,"itemType":2,"version":0}]
		isAliveGdprConsentForm: boolean  // true
	}
	export type Request = JapanRequest | GlobalRequest
	export interface Response {
		userId: int
		friendCode: string
		sessionId: string
		encryptionKey: string
	}
}
export namespace MigrationRestorePassword {
	export interface JapanRequest {
		friendCode: string
		password: string
		uuid: string
		platformType: PlatformType
		uniqueDeviceId: string
		adId: string
		deviceInfo: UserDeviceInfo
	}
	export interface GlobalRequest {
		friendCode: string
		password: string
		uuid: string
		platformType: PlatformType
		countryCode: string
		languageCode: string
		voiceLanguageType: VoiceLanguageType
		uniqueDeviceId: string
		adId: string
		deviceInfo: UserDeviceInfo
	}
	export type Request = JapanRequest | GlobalRequest
	export interface Response {
		userId: int
		friendCode: string
		sessionId: string
		encryptionKey: string
		tamerName: string
		tamerLevel: int
		consentFormItemData?: GdprConsentItem[]  // global only
	}
}
export namespace UserGdpr {
	export interface Request {
		consentFormItemData: GdprConsentItem[]
	}
	export interface Response {
		required: boolean
	}
}
export namespace MigrationBackupPassword {
	export interface Request {}
	export interface Response {
		password: string
	}
}
export namespace FriendSearch {
	export interface Request {
		friendCode: string
	}
	export interface Response {
		friendInfo: Friend
	}
}
export namespace JapanUserLogin {
	export interface Request {
		uuid: string
		userId: number
		adId: string
		isDevelopmentMode: boolean
		isRoot: boolean
		validationCode: string
		deviceInfo: UserDeviceInfo
	} 
	export interface Response {
		sessionId: string
		encryptionKey: string
		isLoadNecessary: boolean
	}
}
export namespace GlobalUserLogin {
	export interface Request extends JapanUserLogin.Request {
		countryCode: string
		languageCode: string
		timezoneOffset: string
	}
	export interface Response extends JapanUserLogin.Response {
		languageChangeableCount: number
		voiceChangeableCount: number
	}
}
export namespace UserLogin {
	export type Request = JapanUserLogin.Request | GlobalUserLogin.Request
	export type Response = JapanUserLogin.Response | GlobalUserLogin.Response
}
export namespace UserGetAll {
	export interface Request {}
	export interface Response {
		userData: UserData
	}
}
export namespace HomeLogin {
	export interface Request {}
	export interface Response {
		receivedLoginBonusList: ReceivedBonus[]
	}
}
export namespace HomeStatusEvery {
	interface ClanChildhoodDigimon {
		moodValue: number
		lastCaredAt: string
	}
	interface AdventureInfo {
		questLastPlayTime: string
		underworldLastPlayTime?: string
		isEncountRaid: boolean
		isRescuedRaid: boolean
		isOpenReview: boolean
		isEndRaid: boolean
	}
	export interface Request {}
	export interface Response {
		informationList: Information[]
		unreceivedPresentCount: number
		unreceivedMissionIds: number[]
		specialMissionInfo?: SpecialMissionInfo
		adventureInfo: AdventureInfo
		userHatchingCapsuleList: UserHatchingCapsule[]
		clanCapsuleChildDigimon?: ClanChildhoodDigimon | null  // FIXME
		questHistoryId: number  // "obsolete"
		battleResume?: BattleResume
		isActiveChallenge: boolean
		unreceivedChallengeIdList: number[]
		newChallengeGroupIdList: number[]
		raidEventInSessionList: RaidEventInSession[]
		scenarioEventInSessionList: ScenarioEventInSession[]
		// isResetScenarioEventTeam: boolean
		isEntryBP2: boolean
		isOpeningXLB: boolean
		bceInSessionList: BceInSession[]
		resetTeamIdList: number[]
		homeScenarioInfoList?: HomeNotificationInfo[]
		mprInSessionList: MprInSession[]
	}
}
export namespace HomeStatusIntervals {
	interface GashaInfo {
		gashaIds: number[]
		isHighlight: boolean
	}
	export interface Request {}
	export interface Response {
		socialTopInfo: SocialTopInfo
		reloadPrizeList: ReloadPrizeInfo[]
		bannerIds: number[]
		gashaInfo: GashaInfo
		isDigirubySaleAvailable: boolean
		visitorList: Visitor[]
		homeCircleAssetName: string
	}
}
export namespace HomeDigimonEdit {
	export interface Request {
		homeDigimonList: int[]
	}
	export interface Response {
		result: boolean
	}
}
export namespace InformationGetList {
	export interface Request {}
	export interface Response {
		informationList: Information[]
		bannerIdList: int[]
	}
}
export namespace InformationGetDetail {
	export interface Request {
		informationId: int
	}
	export interface Response {
		description: string
	}
}
export interface Challenge {
	challengeId: int
	progress: int
	state: int
}
export interface ChallengeGroup {
	challengeGroupId: int
	rank: int
	endDate: string
	challengeList: Challenge[]
}
export namespace ChallengeTop {
	export interface Request {}
	export interface Response {
		challengeGroupList: ChallengeGroup[]
		endChallengeGroupIdList: int[]
	}
}
export namespace SideMenuGetEvent {
	export interface Request {}
	export interface Response {
		raidEventInSessionList: RaidEventInSession[]
		scenarioEventInSessionList: ScenarioEventInSession[]
		bceInSessionList: BceInSession[]
		mprInSessionList: MprInSession[]
	}
}
export namespace PresentTop {
	export interface Request {}
	export interface Response {
		presentList: Present[]
		socialPresentList: Present[]
		isPresentOver: boolean
		isSocialOver: boolean
	}
}
export interface Tamer {
	userId: int
	tamerName: string
	tamerLevel: int
	greetings: string
	relationshipType: int
	isClanMember: boolean
	lastLogin: string
	digimon: DigimonDetail
}
export interface LogListInfo {
	socialLogType: int
	captionText: string
	isNew: boolean
	createdAt: string
	tamerInfo: Tamer
}
export interface LogObject {
	count: int
	isNew: boolean
	updatedAt: string
}
export namespace HomeBoard {
	export interface Request {
		isOpenBbs: boolean
	}
	export interface Response {
		logList: LogListInfo[]
		reliefRequest: LogObject
		friend: LogObject
		clan: LogObject
		clanCareRequest: LogObject
		helper: LogObject
	}
}
export interface Friend {
	userId: int
	tamerName: string
	tamerLevel: int
	greetings: string
	relationshipType: int
	isClanMember: boolean
	lastLogin: string
	nextGreetingTime: string
	digimon: DigimonDetail
	isNewApproved: boolean
	addDate: string
	playableRivalBattle: boolean
	leagueVictoryCount: int
}
export namespace FriendTop {
	export interface Request {}
	export interface Response {
		friendList: Friend[]
		approvalWaitingList: Friend[]
		applyingList: Friend[]
		approvalWaitingLimit: int
		applyingLimit: int
		addCommuPoint?: int
	}
}
export interface UserRaidCatalog {
	raidId: int
	reachLevel: int
}
export namespace RaidTop {
	export interface Request {}
	export interface Response {
		notJoinList: RaidInfo[]
		joinList: RaidInfo[]
		endList: RaidInfo[]
		userRaidCatalogList: UserRaidCatalog[]
		latestRaidCatalogDate: string
	}
}
export interface RaidLevelAndBattleIdMap {
	level: int
	battleId: int
	costStamina: int
	itemIdList: int[]
	isOverlapped: boolean
	firstPrize: PrizeInfo
	scenarioId: int
}
export interface RaidCatalog {
	raidId: int
	dna: int
	bodyAsset: string
	textAsset: string
	digimonId: int
	raidLevelAndBattleIdMapList: RaidLevelAndBattleIdMap[]
}
export namespace RaidCatalogTop {
	export interface Request {}
	export interface Response {
		raidCatalogList: RaidCatalog[]
	}
}
export interface ApprovalClanInfo {
	requestId: int
	clanId: int
	name: string
	trademarkId: int
	purposeFlags: int
	isFreeEntry: boolean
	leaderName: string
	leaderTamerLevel: int
	memberCount: int
	introduction: string
	leaderLeagueVictoryCount: int
}
export namespace ClanSearchScreen {
	export interface Request {}
	export interface Response {
		approvalList: ApprovalClanInfo[]
		recommendedList: ApprovalClanInfo[]
	}
}
export namespace DigimonScrounge {
	interface DigimonScroungeInfo {
		userDigimonId: int
		scroungeId: int
		endTime: string
	}
	export interface Request {}
	export interface Response {
		digimonList: DigimonScroungeInfo[]
	}
}
export interface RaidRankingPeriodInfo {
	periodId: int
	startDate: string
	occurrenceEndDate: string
	endDate: string
}
export interface RaidRankingScenarioDictionaryInfo {
	eventId: int
	titleTextId: int
	imageAsset: string
	rankingAsset: string
	periodList: RaidRankingPeriodInfo[]
}
export namespace RaidRankingScenarioDictionary {
	export interface Request {}
	export interface Response {
		dictionaryList: RaidRankingScenarioDictionaryInfo[]
	}
}
export interface TextInfo {
	key: string
	textId: int
}
export interface RaidRankingRecordRankingInfo {
	rankingCategory: int
	rankingType: int
	ranking: int
	score: int
	textList: TextInfo[]
	isAggregating: boolean
}
export namespace RaidRankingRecord {
	export interface Request {
		eventId: int
		periodId: int
	}
	export interface Response {
		recordList: RaidRankingRecordRankingInfo[]
	}
}
export interface MissionProgressInfo {
	missinType: int
	condition: int
	progressCount: long
}
export namespace MissionTop {
	export interface Request {}
	export interface Response {
		missionProgressInfoList: MissionProgressInfo[]
		notReceiveMissionIdList: int[]
		playingSpecialMissionId?: int
	}
}
export namespace MissionReceive {
	export interface Request {
		receiveMissionIdList: int[]
	}
	export interface Response {
		successList: int[]
		failList: int[]
		receivedItemList: PrizeInfo[]
	}
}
export namespace MissionComplete {
	export interface Request {
		condition: int
	}
	export interface Response {
		result: boolean
	}
}
export const enum WeeklyLevelType {
	Beginner = 1,
	Intermediate = 2,
	Advanced = 3,
	Super = 4,
}
export interface WeeklyProgressInfo {
	weeklySectionId: int
	weeklyLevel: WeeklyLevelType
}
export namespace WeeklyTop {
	export interface Request {}
	export interface Response {
		weeklyProgressInfoList: WeeklyProgressInfo[]
	}
}
export interface WeeklyQuestTimesInfo {
	weeklySectionId: int
	weeklyQuestId: int
	count: int
}
export namespace WeeklyTimesInfo {
	export interface Request {}
	export interface Response {
		weeklyQuestTimesInfoList: WeeklyQuestTimesInfo[]
	}
}
export interface XlbPrize {
	prizeType: PrizeType
	prizeId: int
	prizeCount: int
}
export interface XlbQuest {
	questId: int
	difficultyTextId: int
	digimonId: int
	contentAsset: string
	bannerAsset: string
	battleId: int
	userExp: int
	prizeList: XlbPrize[]
	playState: int
}
export interface XlbSection {
	sectionId: int
	title: string
	bannerAsset: string
	startDate: string
	endDate: string
	helperStyle: int
	questList: XlbQuest[]
}
export namespace XlbGetTop {
	export interface Request {}
	export interface Response {
		sectionList: XlbSection[]
	}
}
export interface ExchangeInfo {
	sequence: int
	exchangedCount: int
}
export interface Shop {
	shopId: int
	exchangeInfoList: ExchangeInfo[]
}
export interface LimitedTimeEventInfo {
	eventId: int
	endDate: string
}
export namespace ShopTop {
	export interface Request {}
	export interface Response {
		shopList: Shop[]
		reloadPrizeList: ReloadPrizeInfo[]
		limitedTimeEventList: LimitedTimeEventInfo[]
		isMaintenanceApi: boolean
		maintenanceText: string
	}
}
export interface GashaInfo {
	gashaId: int
	name: string
	costType: int
	costAmount: int
	costId: int
	isFree: boolean
	demoAsset: string
	messageTextIdList: int[]
}
export const enum GashaType {
	Digimon = 0,
	Plugin = 1,
	StepupDigimon = 2,
	StepupPlugin = 3,
}
export interface GashaGroupInfo {
	gashaGroupId: int
	dispOrder: int
	gashaType: GashaType
	pickupList: int[]
	topList: int[]
	bannerAsset: string
	emissionRateAsset: string
	gashaList: GashaInfo[]
	endDate: string
}
export interface UserDigiruby {
	paidDigiruby: int
	freeDigiruby: int
}
export interface StepupGashaFixInfo {
	prizeType: PrizeType
	prizeId: int
	message: string
	isLimitedFirst: boolean
}
export interface StepupGashaOmakeInfo {
	prizeType: PrizeType
	prizeId: int
	num: int
	isLimitedFirst: boolean
}
export interface StepupGashaStepInfo {
	step: int
	cost: int
	name: string
	description: string
	fixInfo: StepupGashaFixInfo
	omakeInfoList: StepupGashaOmakeInfo[]
}
export interface StepupGashaGroupInfo {
	gashaGroupId: int
	loopType: int
	currentLoop: int
	loopMax: int
	displayAsset: string
	description: string
	currentStep: int
	stepInfoList: StepupGashaStepInfo[]
}
export namespace GashaTop {
	export interface Request {}
	export interface Response {
		gashaGroupList: GashaGroupInfo[]
		userDigiruby: UserDigiruby
		stepupGashaGroupList: StepupGashaGroupInfo[]
	}
}
export interface GashaRate {
	prizeType: PrizeType  // declared as int
	prizeId: int
	rate: string
	dispOrder: int
}
export interface GashaLottyery {
	lotteryOrder: int
	lotteryId: int
	num: string
	isAdditional: boolean
	rateList: GashaRate[]
}
export interface GashaRateGroup {
	gashaId: int
	lotteryList: GashaLottyery[]
}
export namespace GashaGetRate {
	export interface Request {
		gashaIdList?: int[]
		gashaGroupId?: int
	}
	export interface Response {
		rateList: GashaRateGroup[]
		warningMessage: string
	}
}
export interface GashaPrizeInfo {
	prizeInfo: PrizeInfo
	colorIndex: int
	isAdditional: boolean
	isNewGenealogy: boolean
}
export interface GashaDemoFlow {
	eventTiming: int
	eventValue: string
}
export namespace GashaRoll {
	export interface Request {
		gashaId: int
	}
	export interface Response {
		demoAsset: string
		prizeInfoList: GashaPrizeInfo[]
		userDigiruby: UserDigiruby
		omakePrizeInfoList: PrizeInfo[]
		isSentOmakePresent: boolean
		isNextStep: boolean
		demoFlowList: GashaDemoFlow[]
	}
}
export namespace DigimonTeamEdit {
	interface UserTeam {
		teamId: int
		userDigimonList: int[]
	}
	export interface Request {
		userTeamList: UserTeam[]
	}
	export interface Response {
		result: boolean
	}
}
export namespace PluginSell {
	export interface Request {
		userPluginIdList: int[]
	}
	export interface Response {
		result: boolean
	}
}
export namespace ProfileTop {
	export interface Request {}
	export interface Response {
		greetings: string
		battleParkRankId: int
		battleParkPoint: int
		clanName: string
		friendCount: int
		battleParkLeagueType: int
		battleParkLeagueVictoryCount?: int
	}
}
export namespace ProfileEdit {
	export interface Request {
		name: string
		greetings: string
	}
	export interface Response {
		result: boolean
	}
}
export interface PurchaseHistory {
	purchaseDate: string
	count: int
	cost: string
}
export namespace DpointGetPurchaseHistory {
	export interface Request {}
	export interface Response {
		freeDigiruby: int
		purchaseDigiruby: int
		purchaseHistoryList: PurchaseHistory[]
	}
}
export namespace ChangeLanguage {  // global only
	export interface Request {
		languageCodeType: LanguageCodeType
	}
	export interface Response {
		result: boolean
	}
}
export namespace ChangeVoice {  // global only
	export interface Request {
		voiceLanguageType: VoiceLanguageType
	}
	export interface Response {
		result: boolean
	}
}
export interface DigimonTeam {
	userDigimonId: int
	moodValue: float
	lastCareTime: string
}
export interface DigimonOpponent {
	digimonId: int
	level: int
	index: int
	dropAssetPath?: string
}
export interface Wave {
	waveNum: int
	digimonOpponentList: DigimonOpponent[]
}
export namespace QuestStart {
	export interface Request {
		questId: int
		questType: QuestType
		teamId: int
		helperUserId: int
		slayerIdList: int[]
		resumeInfo: string
		digimonParameterList: BattleLogParameterInfo[]
		partnerDigimonParameter: BattleLogParameterInfo
		helperDigimonParameter: BattleLogParameterInfo
	}
	export interface Response {
		waveList: Wave[]
		teamList: DigimonTeam[]
		historyId: int
		replaceBattleId: int
		slayerIdList: int[]
	}
}
export interface DiscoveryRaidInfo {
	raidId: int
	uniqueRaidId: int
	level: int
	battleId: int
}
export interface DigimonFriendshipPoint {
	userDigimonId: int
	beforeFriendshipPoint: int
	afterFriendshipPoint: int
}
export interface ApiRequestBattleBase {
	logInfo: BattleLogInfo
}
export namespace QuestClear {
	export interface Request extends ApiRequestBattleBase {
		historyId: int
		friendshipSkillCount: int
		clearedEvaluationIdList: int[]
		isSkipStartScenario: boolean
		downCount: int
		elapsedTime: int
	}
	export interface Response {
		firstClearRewardList: PrizeInfo[]
		totalTamerExp: int
		dropItemList: PrizeInfo[]
		bonusItemList?: PrizeInfo[]
		dropItemAssetList: string[]
		bonusItemAssetList?: string[]
		dropItemIncreasedAmountList: int[]
		bonusItemIncreasedAmountList?: int[]
		digimonFriendshipPointList: DigimonFriendshipPoint[]
		discoveryRaidInfo?: DiscoveryRaidInfo
		defeatBitRewardList: int[]
		isEvaluationCompleteFlag: boolean
		totalAddedTamerExp: int
		tamerLevel: int
		recoveredStamina: int
		staminaChangeTime: string
		activeQuestCampaignSequenceList: int[]
		unlockQuestIdList: int[]
	}
}
export interface EcCampaignInfo {
	textId: int
	displayPosition: int
	startDate: string
	endDate: string
}
export interface EcDigimonStatus {
	userDigimonId: int
	hp: int
	coolTimeList: int[]
}
export interface BattleAsset {
	bgAsset: string
	skyboxAsset: string
	placementAsset: string
}
export interface BattleDigimonInfo {
	index: int
	digimonDetail: DigimonDetail
	dropAssetPath: string
}
export interface BattleWave {
	wave: int
	digimonInfoList: BattleDigimonInfo[]
}
export interface BattleCore {
	battleId: int
	battleAsset: BattleAsset
	waveList: BattleWave[]
	floorSkill: BattleFloorSkill
}
export interface BattleFloorSkill {
	skillId: int
	level: int
}
export interface EcFloorInfo {
	nodeId: int
	floor: int
	floorStyle: EcFloorStyle
	difficulty: int
	staminaCost: int
	userExp: int
	gainFriendship: int
	description: string
	floorSkill: BattleFloorSkill
	wave: int
	floorRaidInfo: EcFloorRaidInfo
	hardFloorQuestInfo: EcHardFloorQuestInfo
	prizeLevel: int
}
export interface EcFloorRaidInfo {
	raidId: int
	textAsset: string
	digimonId: int
}
export interface EcHardFloorQuestInfo {
	digimonIdList: int[]
}
export interface EcLineInfo {
	fromNodeId: int
	toNodeId: int
}
export interface EcMapInfo {
	mapAsset: string
	lineInfoList: EcLineInfo[]
	floorInfoList: EcFloorInfo[]
}
export interface EcNodeInfo {
	nodeId: int
	state: EcNodeState
}
export const enum EcNodeState {
	Selectable = 0,
	Cleared = 1,
	Unselectable = 2,
	Unreachable = 3,
}
export interface EcPrizeInfo {
	prizeInfoList: PrizeInfo[]
	rareType: int
}
export interface EcStockPrizeInfo {
	prizeType: PrizeType
	prizeId: int
	prizeCount: int
}
export interface EcUserProgressInfo {
	currentNodeId: int
	nodeInfoList: EcNodeInfo[]
	digimonStatusList: EcDigimonStatus[]
	friendshipSkillCoolTime: int
	stockPrizeInfoList: EcStockPrizeInfo[]
}
export const enum EcFloorStyle {
	Quest = 0,
	Raid = 1,
	BattlePark = 2,
}
export namespace EcClear {
	export interface Request extends ApiRequestBattleBase {
		historyId: int
		digimonStatusList: EcDigimonStatus[]
		friendshipSkillCoolTime: int
		friendshipSkillCount: int
		participationTeamIdList: int[]
	}
	export interface Response {
		stockPrizeInfoList: EcStockPrizeInfo[]
		totalTamerExp: int
		digimonFriendshipPointList: DigimonFriendshipPoint[]
		tamerLevel: int
		recoveredStamina: int
		staminaChangeTime: string
	}
}
export namespace EcContinue {
	export interface Request {
		historyId: int
		continuationInfo: string
	}
	export interface Response {
		result: boolean
	}
}
export namespace EcResume {
	export interface Request {
		historyId: int
	}
	export interface Response extends EcStart.Response {
		resumeInfo: string
		continuationInfo: string
	}
}
export namespace EcRetire {
	export interface Request {
		historyId: int
	}
	export interface Response {
		result: boolean
	}
}
export namespace EcReturn {
	export interface Request {
		ecHistoryId: int
	}
	export interface Response {
		prizeInfoList: EcPrizeInfo[]
	}
}
export namespace EcReverse {
	export interface Request {
		ecHistoryId: int
	}
	export interface Response {
		userProgressInfo: EcUserProgressInfo
	}
}
export namespace EcStart {
	export interface Request {
		nodeId: int
		teamId: int
		digimonParameterList: BattleLogParameterInfo[]
		partnerDigimonParameter: BattleLogParameterInfo
		resumeInfo: string
	}
	export interface Response {
		historyId: int
		teamList: DigimonTeam[]
		core: BattleCore
		tamerName: string
		rankId: int
	}
}
export namespace EcTop {
	export interface Request {}
	export interface Response {
		ecId: int
		bodyAsset: string
		userProgressInfo: EcUserProgressInfo
		mapInfo: EcMapInfo
		campaignInfoList: EcCampaignInfo[]
		isReverse: boolean
		isHardPlayable: boolean
	}
}
export namespace DigimonSetPartner {
	export interface Request {
		userDigimonId: int
	}
	export interface Response {
		result: boolean
	}
}
export interface Version {
	appVersion: string
	masterVersion: string
	resourceVersion: string
}
export interface CommonRequest {
	osType: OsType
	version: Version
	languageCodeType?: LanguageCodeType  // global only
}
export interface CommonResponse {
	clearMissionIdList: int[]
	clearChallengeIdList: int[]
	tutorialInfo?: TutorialInfo
}
export type WithCommonRequest<T extends object> = T & {commonRequest: CommonRequest}
export type WithCommonResponse<T extends object> = T & {commonResponse: CommonResponse}
export interface Error {
	errorNumber: int
	message?: string
	action?: string
	url?: string
}
export const enum ErrorNumber
{
	None = 0,
	ApplicationUpdate = 1000000,
	NetworkError = 1000001,
	MaintenanceAll = 1000002,
	MasterOrResourceUpdate = 1000003,
	MaintenanceApi = 1000004,
	ServerError = 1000005,
	QuestAlreadyOpend = 1000006,
	UserInheritance = 1000007,
	BattleParkTimeout = 1000008,
	ExecuteOutOfPeriod = 1000009,
	BattleAlreadyStarted = 1000010,
	ClanExpulsioned = 1000011,
	ClanUpdated = 1000012,
	ClanNameOverlap = 1000013,
	NGWord = 1000014,
	ClanNotCreated = 1000015,
	ClanNotFound = 1000016,
	DayChanged = 1000017,
	FriendMaxOwn = 1000018,
	FriendMaxYour = 1000019,
	FriendSearchMyId = 1000020,
	FriendNotFound = 1000021,
	FriendUpdated = 1000022,
	ReceivedOutOfPeriod = 1000023,
	ReceivedInventoryLimit = 1000024,
	RaidTimeout = 1000025,
	ShopOutOfPeriod = 1000026,
	BanUser = 1000027,
	UserNotExists = 1000028,
	DisconnectedSession = 1000029,
	RaidJoinMax = 1000030,
	FailedResponseConvert = 1000031,
	ClientError = 1000032,
	NGWordInUserName = 1000033,
	NGWordInUserProfile = 1000034,
	NGWordInClanName = 1000035,
	NGWordInClanIntroduction = 1000036,
	DuplicateSnsAccount = 1000037,
	ClanNameCharacterOver = 1000038,
	ClanIntroductionCharacterOver = 1000039,
	UserNameCharacterOver = 1000040,
	PurchasersLimitExceeded = 1000041,
	UserProfileCharacterOver = 1000042,
	iTunesReceiptRecovery = 1000043,
	PurchaseReceiptDuplication = 1000044,
	CooltimeClanJoinError = 1000045,
	CareClanDigimonError = 1000046,
	LeaderLeaveClan = 1000047,
	AlreadyJoinedClan = 1000048,
	ApplicationExpired = 1000049,
	ClanFullMember = 1000051,
	AlreadyFinishedRaid = 1000052,
	PaidDigirubyLimitExceeded = 1000053,
	ThatClanMemberHadAlreadyLeft = 1000054,
	NotAttendedClanMemeberYesterday = 1000055,
	ClanCareRequestExpired = 1000056,
	IOException = 1000057,
	LockedResotrePassword = 1000058,
	PurchaseReceiptOld = 1000059,
	MissionDidNonExist = 1000060,
	DownloadSceneError = 1000061,
	ClanLeaveCoolTime = 1000063,
	ClanExpulsionCoolTime = 1000064,
	RaidCatalogDiscoverLimit = 1000065,
	AlreadyAnswered = 1000066,
	WeeklyQuestLimitExceeded = 1000067,
}
