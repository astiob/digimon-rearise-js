import type {KeysToSnakeCase, MapToIndex} from './util'

// type MasterCacheDataBase<Entity, PrimaryKey extends keyof Entity> =
// 	Entity[PrimaryKey] extends number
// 		? { [id: number]: Entity }
// 		: { [id: string]: Entity }

type Stringy<T> = {
	[K in keyof T]: string
}

// .filter(row => !row.values().includes('#REF!'))
function SingleValuedMasterCacheData<Entity, PrimaryKey extends keyof Entity>(
	Entity: new (stringy: Stringy<KeysToSnakeCase<Entity>>) => Entity,
	primaryKey: PrimaryKey,
) {
	return class extends Map<Entity[PrimaryKey], Entity> {
		constructor(data: {masterRows: Stringy<KeysToSnakeCase<Entity>>[]}) {
			super(data.masterRows.map(row => {
				const entity = new Entity(row)
				return [entity[primaryKey], entity]
			}))
		}
	}
}
function NestedSingleValuedMasterCacheData<Entity, PrimaryKey1 extends keyof Entity, PrimaryKey2 extends keyof Entity>(
	Entity: new (stringy: Stringy<KeysToSnakeCase<Entity>>) => Entity,
	primaryKey1: PrimaryKey1,
	primaryKey2: PrimaryKey2,
) {
	return class extends Map<Entity[PrimaryKey1], Map<Entity[PrimaryKey2], Entity>> {
		constructor(data: {masterRows: Stringy<KeysToSnakeCase<Entity>>[]}) {
			super()
			for (const row of data.masterRows) {
				const entity = new Entity(row)
				const id1 = entity[primaryKey1]
				const id2 = entity[primaryKey2]
				const map = this.get(id1)
				if (map)
					map.set(id2, entity)
				else
					this.set(id1, new Map([[id2, entity]]))
			}
		}
	}
}
type NestedMap<Key1, RestKeys extends any[], Value> = Map<Key1, RestKeys extends [infer Key2, ...infer Tail] ? NestedMap<Key2, Tail, Value> : Value>
function NestedOrderedMultiValuedMasterCacheData<Entity, PrimaryKey1 extends keyof Entity, RestPrimaryKeys extends (keyof Entity)[], OrderKey extends keyof Entity>(
	Entity: new (stringy: Stringy<KeysToSnakeCase<Entity>>) => Entity,
	...keys: [PrimaryKey1, ...RestPrimaryKeys, OrderKey]
) {
	const orderKey = keys.pop() as OrderKey
	return class extends (Map as new () => NestedMap<Entity[PrimaryKey1], MapToIndex<Entity, RestPrimaryKeys>, Entity[]>) {
		constructor(data: {masterRows: Stringy<KeysToSnakeCase<Entity>>[]}) {
			super()
			for (const entity of data.masterRows.map(row => new Entity(row)).sort((a, b) => {
				const aOrder = a[orderKey]
				const bOrder = b[orderKey]
				return aOrder < bOrder ? -1 : aOrder > bOrder ? 1 : 0
			})) {
				const ids = keys.map<any>(key => entity[key])
				const lastId = ids.pop()
				let map: Map<any, any> = this
				for (const id of ids) {
					let value = map.get(id)
					if (!value) {
						value = new Map
						map.set(id, value)
					}
					map = value
				}
				const array: Entity[] = map.get(lastId)
				if (array)
					array.push(entity)
				else
					map.set(lastId, [entity])
			}
		}
	}
}
function MultiValuedMasterCacheData<Entity, PrimaryKey extends keyof Entity>(
	Entity: new (stringy: Stringy<KeysToSnakeCase<Entity>>) => Entity,
	primaryKey: PrimaryKey,
) {
	return class extends Map<Entity[PrimaryKey], Entity[]> {
		constructor(data: {masterRows: Stringy<KeysToSnakeCase<Entity>>[]}) {
			super()
			for (const row of data.masterRows) {
				const entity = new Entity(row)
				const id = entity[primaryKey]
				const array = this.get(id)
				if (array)
					array.push(entity)
				else
					this.set(id, [entity])
			}
		}
	}
}

export type AppConstantCategory =
	  'SYSTEM'
	| 'DIGIMON'
	| 'MISSION'
	| 'PLUGIN'
	| 'SHOP'
	| 'CLAN'
	| 'BATTLEPARK'
	| 'EXTENSION'
	| 'COST'
	| 'FOOTPRINT'
	| 'QUEST'
	| 'UNLOCK'
	| 'BATTLE'
	| 'GASHA'
	| 'SUBJUGATION'
	| 'TRAINING'

class AppConstantMasterParam {
	category: AppConstantCategory
	name: string
	value: string
	description: string

	constructor(stringy: Stringy<KeysToSnakeCase<AppConstantMasterParam>>) {
		this.category = stringy.category as AppConstantCategory
		this.name = stringy.name
		this.value = stringy.value
		this.description = stringy.description
	}
}

class CareInfluenceMasterParam {
	motivation: number
	influenceMoodValueRate: number
	influenceFriendshipRate: number

	constructor(stringy: Stringy<KeysToSnakeCase<CareInfluenceMasterParam>>) {
		this.motivation = +stringy.motivation
		this.influenceMoodValueRate = +stringy.influence_mood_value_rate
		this.influenceFriendshipRate = +stringy.influence_friendship_rate
	}
}

class ChildhoodEvolveMasterParam {
	prevDigimonId: number
	nextDigimonId: number
	evolveTime: number
	bit: number
	friendshipLevel: number
	normalTimesSpeed: number
	goodTimesSpeed: number
	greatTimesSpeed: number

	constructor(stringy: Stringy<KeysToSnakeCase<ChildhoodEvolveMasterParam>>) {
		this.prevDigimonId = +stringy.prev_digimon_id
		this.nextDigimonId = +stringy.next_digimon_id
		this.evolveTime = +stringy.evolve_time
		this.bit = +stringy.bit
		this.friendshipLevel = +stringy.friendship_level
		this.normalTimesSpeed = +stringy.normal_times_speed
		this.goodTimesSpeed = +stringy.good_times_speed
		this.greatTimesSpeed = +stringy.great_times_speed
	}
}

class DefaultTamerNameMasterParam {
	tamerNameId: number
	tamerName: string

	constructor(stringy: Stringy<KeysToSnakeCase<DefaultTamerNameMasterParam>>) {
		this.tamerNameId = +stringy.tamer_name_id
		this.tamerName = stringy.tamer_name
	}
}

class DigimonBookMasterParam {
	code: string
	sortKey: string
	profile: string
	iconAsset: string
	attribute: number
	type: number
	startDate: string

	constructor(stringy: Stringy<KeysToSnakeCase<DigimonBookMasterParam>>) {
		this.code = stringy.code
		this.sortKey = stringy.sort_key
		this.profile = stringy.profile
		this.iconAsset = stringy.icon_asset
		this.attribute = +stringy.attribute
		this.type = +stringy.type
		this.startDate = stringy.start_date
	}
}

class DigimonDecreaseMotivationMasterParam {
	generation: number
	decreaseValue: number

	constructor(stringy: Stringy<KeysToSnakeCase<DigimonDecreaseMotivationMasterParam>>) {
		this.generation = +stringy.generation
		this.decreaseValue = +stringy.decrease_value
	}
}

class DigimonFriendshipLevelMasterParam {
	evolutionaryType: number
	friendshipLevel: number
	friendshipPoint: number
	totalFriendshipPoint: number

	constructor(stringy: Stringy<KeysToSnakeCase<DigimonFriendshipLevelMasterParam>>) {
		this.evolutionaryType = +stringy.evolutionary_type
		this.friendshipLevel = +stringy.friendship_level
		this.friendshipPoint = +stringy.friendship_point
		this.totalFriendshipPoint = +stringy.total_friendship_point
	}
}

class DigimonLevelMasterParam {
	evolutionaryType: number
	level: number
	bit: number
	totalBit: number

	constructor(stringy: Stringy<KeysToSnakeCase<DigimonLevelMasterParam>>) {
		this.evolutionaryType = +stringy.evolutionary_type
		this.level = +stringy.level
		this.bit = +stringy.bit
		this.totalBit = +stringy.total_bit
	}
}

class DigimonMasterParam {
	digimonId: number
	code: string
	name: string
	attackType: number
	personalityType: number
	growthType: number
	generation: number
	dna: number
	evolutionaryType: number
	defaultMaxLevel: number
	defaultMaxFriendshipLevel: number
	modelAsset: string
	iconAsset: string
	emotionIconAsset: string
	normalAttackSkillId: number
	passiveSkillId: number
	friendSkillId: number
	isLimited: boolean
	sellingPrice: number
	dotIconAsset: string
	wholeImageAsset: string
	pickupPluginAsset: string
	voiceType: number
	genealogy: number

	constructor(stringy: Stringy<KeysToSnakeCase<DigimonMasterParam>>) {
		this.digimonId = +stringy.digimon_id
		this.code = stringy.code
		this.name = stringy.name
		this.attackType = +stringy.attack_type
		this.personalityType = +stringy.personality_type
		this.growthType = +stringy.growth_type
		this.generation = +stringy.generation
		this.dna = +stringy.dna
		this.evolutionaryType = +stringy.evolutionary_type
		this.defaultMaxLevel = +stringy.default_max_level
		this.defaultMaxFriendshipLevel = +stringy.default_max_friendship_level
		this.modelAsset = stringy.model_asset
		this.iconAsset = stringy.icon_asset
		this.emotionIconAsset = stringy.emotion_icon_asset
		this.normalAttackSkillId = +stringy.normal_attack_skill_id
		this.passiveSkillId = +stringy.passive_skill_id
		this.friendSkillId = +stringy.friend_skill_id
		this.isLimited = !!+stringy.is_limited
		this.sellingPrice = +stringy.selling_price
		this.dotIconAsset = stringy.dot_icon_asset
		this.wholeImageAsset = stringy.whole_image_asset
		this.pickupPluginAsset = stringy.pickup_plugin_asset
		this.voiceType = +stringy.voice_type
		this.genealogy = +stringy.genealogy
	}
}

class DigimonParameterMasterParam {
	growthType: number
	level: number
	hp: number
	attack: number
	defense: number
	speed: number

	constructor(stringy: Stringy<KeysToSnakeCase<DigimonParameterMasterParam>>) {
		this.growthType = +stringy.growth_type
		this.level = +stringy.level
		this.hp = +stringy.hp
		this.attack = +stringy.attack
		this.defense = +stringy.defense
		this.speed = +stringy.speed
	}
}

class DigimonSellMasterParam {
	generation: number
	sellingPrice: number

	constructor(stringy: Stringy<KeysToSnakeCase<DigimonSellMasterParam>>) {
		this.generation = +stringy.generation
		this.sellingPrice = +stringy.selling_price
	}
}

class DigimonSkillMasterParam {
	digimonId: number
	orderId: number
	skillId: number

	constructor(stringy: Stringy<KeysToSnakeCase<DigimonSkillMasterParam>>) {
		this.digimonId = +stringy.digimon_id
		this.orderId = +stringy.order_id
		this.skillId = +stringy.skill_id
	}
}

class EvolveMasterParam {
	digimonId: number
	nextDigimonId: number
	stage: number
	demoType: number
	level: number
	bit: number
	evolveUseItemId: number
	friendshipLevel: number
	addMaxLevel: number
	addMaxFriendshipLevel: number

	constructor(stringy: Stringy<KeysToSnakeCase<EvolveMasterParam>>) {
		this.digimonId = +stringy.digimon_id
		this.nextDigimonId = +stringy.next_digimon_id
		this.stage = +stringy.stage
		this.demoType = +stringy.demo_type
		this.level = +stringy.level
		this.bit = +stringy.bit
		this.evolveUseItemId = +stringy.evolve_use_item_id
		this.friendshipLevel = +stringy.friendship_level
		this.addMaxLevel = +stringy.add_max_level
		this.addMaxFriendshipLevel = +stringy.add_max_friendship_level
	}
}

class EvolveUseItemMasterParam {
	evolveUseItemId: number
	itemId: number
	num: number

	constructor(stringy: Stringy<KeysToSnakeCase<EvolveUseItemMasterParam>>) {
		this.evolveUseItemId = +stringy.evolve_use_item_id
		this.itemId = +stringy.item_id
		this.num = +stringy.num
	}
}

class ItemMasterParam {
	itemId: number
	itemName: string
	sortKey: string
	itemType: number
	iconAsset: string
	friendshipPointRiseValue: number
	moodValueRiseValue: number
	description: string
	maxAmount: number

	constructor(stringy: Stringy<KeysToSnakeCase<ItemMasterParam>>) {
		this.itemId = +stringy.item_id
		this.itemName = stringy.item_name
		this.sortKey = stringy.sort_key
		this.itemType = +stringy.item_type
		this.iconAsset = stringy.icon_asset
		this.friendshipPointRiseValue = +stringy.friendship_point_rise_value
		this.moodValueRiseValue = +stringy.mood_value_rise_value
		this.description = stringy.description
		this.maxAmount = +stringy.max_amount
	}
}

class LimitbreakGroupMasterParam {
	trainingGroupId: number
	trainingId: number
	sortOrder: number

	constructor(stringy: Stringy<KeysToSnakeCase<LimitbreakGroupMasterParam>>) {
		this.trainingGroupId = +stringy.training_group_id
		this.trainingId = +stringy.training_id
		this.sortOrder = +stringy.sort_order
	}
}

class LimitbreakMasterParam {
	digimonId: number
	limitbreakId: number
	necessaryLevel: number
	necessaryLimitbreakCount: number
	costBit: number
	risingHp: number
	risingAttack: number
	risingDefense: number
	risingSpeed: number
	limitFriendshipLevel: number
	limitLevel: number
	nextLimitbreakId: number
	trainingGroupId: number

	constructor(stringy: Stringy<KeysToSnakeCase<LimitbreakMasterParam>>) {
		this.digimonId = +stringy.digimon_id
		this.limitbreakId = +stringy.limitbreak_id
		this.necessaryLevel = +stringy.necessary_level
		this.necessaryLimitbreakCount = +stringy.necessary_limitbreak_count
		this.costBit = +stringy.cost_bit
		this.risingHp = +stringy.rising_hp
		this.risingAttack = +stringy.rising_attack
		this.risingDefense = +stringy.rising_defense
		this.risingSpeed = +stringy.rising_speed
		this.limitFriendshipLevel = +stringy.limit_friendship_level
		this.limitLevel = +stringy.limit_level
		this.nextLimitbreakId = +stringy.next_limitbreak_id
		this.trainingGroupId = +stringy.training_group_id
	}
}

class MotivationThresholdMasterParam {
	generation: number
	normalThreshold: number
	goodThreshold: number
	greatThreshold: number

	constructor(stringy: Stringy<KeysToSnakeCase<MotivationThresholdMasterParam>>) {
		this.generation = +stringy.generation
		this.normalThreshold = +stringy.normal_threshold
		this.goodThreshold = +stringy.good_threshold
		this.greatThreshold = +stringy.great_threshold
	}
}

class PersonalityTypeMasterParam {
	personalityType: number
	name: string

	constructor(stringy: Stringy<KeysToSnakeCase<PersonalityTypeMasterParam>>) {
		this.personalityType = +stringy.personality_type
		this.name = stringy.name
	}
}

class PluginEvolveMasterParam {
	itemId: number
	evolveItemId: number
	evolveBit: number

	constructor(stringy: Stringy<KeysToSnakeCase<PluginEvolveMasterParam>>) {
		this.itemId = +stringy.item_id
		this.evolveItemId = +stringy.evolve_item_id
		this.evolveBit = +stringy.evolve_bit
	}
}

class PluginParameterMasterParam {
	itemId: number
	strengthenValue: number
	sequence: number
	digimonId: number
	parameterType: number
	parameterValue: number
	valueType: number

	constructor(stringy: Stringy<KeysToSnakeCase<PluginParameterMasterParam>>) {
		this.itemId = +stringy.item_id
		this.strengthenValue = +stringy.strengthen_value
		this.sequence = +stringy.sequence
		this.digimonId = +stringy.digimon_id
		this.parameterType = +stringy.parameter_type
		this.parameterValue = +stringy.parameter_value
		this.valueType = +stringy.value_type
	}
}

class PluginWearingMasterParam {
	itemId: number
	sequence: number
	wearingType: number
	wearingValue: number

	constructor(stringy: Stringy<KeysToSnakeCase<PluginWearingMasterParam>>) {
		this.itemId = +stringy.item_id
		this.sequence = +stringy.sequence
		this.wearingType = +stringy.wearing_type
		this.wearingValue = +stringy.wearing_value
	}
}

class QuestMasterParam {
	sectionId: number
	questId: number
	number: number
	releaseQuestId: number
	title: string
	description: string
	staminaCost: number
	userExp: number
	gainFriendship: number
	difficulty: number
	battleId: number
	mapIndex: number
	panelAsset: string
	iconTypes: string
	campaignId: number

	constructor(stringy: Stringy<KeysToSnakeCase<QuestMasterParam>>) {
		this.sectionId = +stringy.section_id
		this.questId = +stringy.quest_id
		this.number = +stringy.number
		this.releaseQuestId = +stringy.release_quest_id
		this.title = stringy.title
		this.description = stringy.description
		this.staminaCost = +stringy.stamina_cost
		this.userExp = +stringy.user_exp
		this.gainFriendship = +stringy.gain_friendship
		this.difficulty = +stringy.difficulty
		this.battleId = +stringy.battle_id
		this.mapIndex = +stringy.map_index
		this.panelAsset = stringy.panel_asset
		this.iconTypes = stringy.icon_types
		this.campaignId = +stringy.campaign_id
	}
}

class ScroungeMasterParam {
	scroungeId: number
	digimonId: number
	itemId: number
	num: number
	friendshipPointRiseValue: number
	moodValueRiseValue: number
	weight: number
	scroungeType: number

	constructor(stringy: Stringy<KeysToSnakeCase<ScroungeMasterParam>>) {
		this.scroungeId = +stringy.scrounge_id
		this.digimonId = +stringy.digimon_id
		this.itemId = +stringy.item_id
		this.num = +stringy.num
		this.friendshipPointRiseValue = +stringy.friendship_point_rise_value
		this.moodValueRiseValue = +stringy.mood_value_rise_value
		this.weight = +stringy.weight
		this.scroungeType = +stringy.scrounge_type
	}
}

class SkillDetailMasterParam {
	skillId: number
	level: number
	sequence: number
	targetParty: number
	targetNum: number
	efficacyType: number
	efficacyPriority: number
	jsonValue: unknown

	constructor(stringy: Stringy<KeysToSnakeCase<SkillDetailMasterParam>>) {
		this.skillId = +stringy.skill_id
		this.level = +stringy.level
		this.sequence = +stringy.sequence
		this.targetParty = +stringy.target_party
		this.targetNum = +stringy.target_num
		this.efficacyType = +stringy.efficacy_type
		this.efficacyPriority = +stringy.efficacy_priority
		this.jsonValue = JSON.parse(stringy.json_value)
	}
}

class SkillLevelupItemMasterParam {
	itemId: number
	category: number
	categoryValue: number
	frameType: number
	dispOrder: number
	stoneType: number

	constructor(stringy: Stringy<KeysToSnakeCase<SkillLevelupItemMasterParam>>) {
		this.itemId = +stringy.item_id
		this.category = +stringy.category
		this.categoryValue = +stringy.category_value
		this.frameType = +stringy.frame_type
		this.dispOrder = +stringy.disp_order
		this.stoneType = +stringy.stone_type
	}
}

class SkillMasterParam {
	skillId: number
	level: number
	name: string
	actionType: number
	coolTime: number
	friendshipCoolTime: number
	actionAsset: string
	friendshipActionAsset: string
	iconAsset: string
	description: string

	constructor(stringy: Stringy<KeysToSnakeCase<SkillMasterParam>>) {
		this.skillId = +stringy.skill_id
		this.level = +stringy.level
		this.name = stringy.name
		this.actionType = +stringy.action_type
		this.coolTime = +stringy.cool_time
		this.friendshipCoolTime = +stringy.friendship_cool_time
		this.actionAsset = stringy.action_asset
		this.friendshipActionAsset = stringy.friendship_action_asset
		this.iconAsset = stringy.icon_asset
		this.description = stringy.description
	}
}

class SlbParameterMasterParam {
	parameterPatternId: number
	level: number
	addHp: number
	addAttack: number
	addDefense: number
	addSpeed: number

	constructor(stringy: Stringy<KeysToSnakeCase<SlbParameterMasterParam>>) {
		this.parameterPatternId = +stringy.parameter_pattern_id
		this.level = +stringy.level
		this.addHp = +stringy.add_hp
		this.addAttack = +stringy.add_attack
		this.addDefense = +stringy.add_defense
		this.addSpeed = +stringy.add_speed
	}
}

class SlbParameterPatternMasterParam {
	generation: number
	personalityType: number
	parameterPatternId: number

	constructor(stringy: Stringy<KeysToSnakeCase<SlbParameterPatternMasterParam>>) {
		this.generation = +stringy.generation
		this.personalityType = +stringy.personality_type
		this.parameterPatternId = +stringy.parameter_pattern_id
	}
}

class TamerLevelMasterParam {
	level: number
	exp: number
	totalExp: number
	friendLimit: number
	staminaLimit: number

	constructor(stringy: Stringy<KeysToSnakeCase<TamerLevelMasterParam>>) {
		this.level = +stringy.level
		this.exp = +stringy.exp
		this.totalExp = +stringy.total_exp
		this.friendLimit = +stringy.friend_limit
		this.staminaLimit = +stringy.stamina_limit
	}
}

class TextMasterParam {
	textId: number
	text: string

	constructor(stringy: Stringy<KeysToSnakeCase<TextMasterParam>>) {
		this.textId = +stringy.text_id
		this.text = stringy.text
	}
}

class TrainingItemMasterParam {
	itemId: number
	compositionId: number
	cost: number

	constructor(stringy: Stringy<KeysToSnakeCase<TrainingItemMasterParam>>) {
		this.itemId = +stringy.item_id
		this.compositionId = +stringy.composition_id
		this.cost = +stringy.cost
	}
}

class TrainingItemMaterialMasterParam {
	compositionId: number
	materialItemId: number
	num: number

	constructor(stringy: Stringy<KeysToSnakeCase<TrainingItemMaterialMasterParam>>) {
		this.compositionId = +stringy.composition_id
		this.materialItemId = +stringy.material_item_id
		this.num = +stringy.num
	}
}

class TrainingMasterParam {
	trainingId: number
	iconAsset: string
	risingHp: number
	risingAttack: number
	risingDefense: number
	risingSpeed: number
	animationName: string

	constructor(stringy: Stringy<KeysToSnakeCase<TrainingMasterParam>>) {
		this.trainingId = +stringy.training_id
		this.iconAsset = stringy.icon_asset
		this.risingHp = +stringy.rising_hp
		this.risingAttack = +stringy.rising_attack
		this.risingDefense = +stringy.rising_defense
		this.risingSpeed = +stringy.rising_speed
		this.animationName = stringy.animation_name
	}
}

class TrainingUseItemMasterParam {
	trainingId: number
	itemId: number
	num: number

	constructor(stringy: Stringy<KeysToSnakeCase<TrainingUseItemMasterParam>>) {
		this.trainingId = +stringy.training_id
		this.itemId = +stringy.item_id
		this.num = +stringy.num
	}
}

class WeeklyLimitMasterParam {
	sectionId: number
	activeOrder: number
	activeStartDate: string
	activeEndDate: string
	openId: number
	countId: number
	displayType: number
	campaignTextId: number

	constructor(stringy: Stringy<KeysToSnakeCase<WeeklyLimitMasterParam>>) {
		this.sectionId = +stringy.section_id
		this.activeOrder = +stringy.active_order
		this.activeStartDate = stringy.active_start_date
		this.activeEndDate = stringy.active_end_date
		this.openId = +stringy.open_id
		this.countId = +stringy.count_id
		this.displayType = +stringy.display_type
		this.campaignTextId = +stringy.campaign_text_id
	}
}

class WeeklyLimitCountMasterParam {
	countId: number
	count: number
	reloadType: number
	reloadValue: number
	reloadDate: string
	jsonValue: unknown

	constructor(stringy: Stringy<KeysToSnakeCase<WeeklyLimitCountMasterParam>>) {
		this.countId = +stringy.count_id
		this.count = +stringy.count
		this.reloadType = +stringy.reload_type
		this.reloadValue = +stringy.reload_value
		this.reloadDate = stringy.reload_date
		this.jsonValue = JSON.parse(stringy.json_value)
	}
}

class WeeklyLimitOpenMasterParam {
	openId: number
	sequence: number
	openDayOfWeek: number
	openTime: string
	closeDayOfWeek: number
	closeTime: string

	constructor(stringy: Stringy<KeysToSnakeCase<WeeklyLimitOpenMasterParam>>) {
		this.openId = +stringy.open_id
		this.sequence = +stringy.sequence
		this.openDayOfWeek = +stringy.open_day_of_week
		this.openTime = stringy.open_time
		this.closeDayOfWeek = +stringy.close_day_of_week
		this.closeTime = stringy.close_time
	}
}

class WeeklyQuestMasterParam {
	weeklySectionId: number
	weeklyQuestId: number
	dispOrder: number
	title: string
	staminaCost: number
	userExp: number
	gainFriendship: number
	difficulty: number
	battleId: number
	iconTypes: string
	startDate: string
	campaignId: number
	mapIndex: number
	panelAsset: string
	level: number

	constructor(stringy: Stringy<KeysToSnakeCase<WeeklyQuestMasterParam>>) {
		this.weeklySectionId = +stringy.weekly_section_id
		this.weeklyQuestId = +stringy.weekly_quest_id
		this.dispOrder = +stringy.disp_order
		this.title = stringy.title
		this.staminaCost = +stringy.stamina_cost
		this.userExp = +stringy.user_exp
		this.gainFriendship = +stringy.gain_friendship
		this.difficulty = +stringy.difficulty
		this.battleId = +stringy.battle_id
		this.iconTypes = stringy.icon_types
		this.startDate = stringy.start_date
		this.campaignId = +stringy.campaign_id
		this.mapIndex = +stringy.map_index
		this.panelAsset = stringy.panel_asset
		this.level = +stringy.level
	}
}

export class AppConstantMaster extends NestedSingleValuedMasterCacheData(AppConstantMasterParam, 'category', 'name') {}
export class CareInfluenceMaster extends SingleValuedMasterCacheData(CareInfluenceMasterParam, 'motivation') {}
class ChildhoodEvolveMasterByNext extends SingleValuedMasterCacheData(ChildhoodEvolveMasterParam, 'nextDigimonId') {}
export class ChildhoodEvolveMaster extends SingleValuedMasterCacheData(ChildhoodEvolveMasterParam, 'prevDigimonId') {
	byNext: ChildhoodEvolveMasterByNext
	constructor(data: {masterRows: Stringy<KeysToSnakeCase<ChildhoodEvolveMasterParam>>[]}) {
		super(data)
		this.byNext = new ChildhoodEvolveMasterByNext(data)
	}
}
export class DefaultTamerNameMaster extends SingleValuedMasterCacheData(DefaultTamerNameMasterParam, 'tamerNameId') {}
export class DigimonBookMaster extends SingleValuedMasterCacheData(DigimonBookMasterParam, 'code') {}
export class DigimonDecreaseMotivationMaster extends SingleValuedMasterCacheData(DigimonDecreaseMotivationMasterParam, 'generation') {}
export class DigimonFriendshipLevelMaster extends NestedSingleValuedMasterCacheData(DigimonFriendshipLevelMasterParam, 'evolutionaryType', 'friendshipLevel') {}
export class DigimonLevelMaster extends NestedSingleValuedMasterCacheData(DigimonLevelMasterParam, 'evolutionaryType', 'level') {}
export class DigimonMaster extends SingleValuedMasterCacheData(DigimonMasterParam, 'digimonId') {}
export class DigimonParameterMaster extends NestedOrderedMultiValuedMasterCacheData(DigimonParameterMasterParam, 'growthType', 'level') {}
export class DigimonSellMaster extends SingleValuedMasterCacheData(DigimonSellMasterParam, 'generation') {}
export class DigimonSkillMaster extends NestedSingleValuedMasterCacheData(DigimonSkillMasterParam, 'digimonId', 'orderId') {}
class EvolveMasterByNext extends SingleValuedMasterCacheData(EvolveMasterParam, 'nextDigimonId') {}
export class EvolveMaster extends SingleValuedMasterCacheData(EvolveMasterParam, 'digimonId') {
	byNext: EvolveMasterByNext
	constructor(data: {masterRows: Stringy<KeysToSnakeCase<EvolveMasterParam>>[]}) {
		super(data)
		this.byNext = new EvolveMasterByNext(data)
	}
}
export class EvolveUseItemMaster extends MultiValuedMasterCacheData(EvolveUseItemMasterParam, 'evolveUseItemId') {}
export class ItemMaster extends SingleValuedMasterCacheData(ItemMasterParam, 'itemId') {}
export class LimitbreakGroupMaster extends MultiValuedMasterCacheData(LimitbreakGroupMasterParam, 'trainingGroupId') {}
export class LimitbreakMaster extends NestedSingleValuedMasterCacheData(LimitbreakMasterParam, 'digimonId', 'limitbreakId') {}
export class MotivationThresholdMaster extends SingleValuedMasterCacheData(MotivationThresholdMasterParam, 'generation') {}
export class PersonalityTypeMaster extends SingleValuedMasterCacheData(PersonalityTypeMasterParam, 'personalityType') {}
export class PluginEvolveMaster extends SingleValuedMasterCacheData(PluginEvolveMasterParam, 'itemId') {}
export class PluginParameterMaster extends NestedOrderedMultiValuedMasterCacheData(PluginParameterMasterParam, 'itemId', 'strengthenValue', 'digimonId', 'sequence') {}
export class PluginWearingMaster extends MultiValuedMasterCacheData(PluginWearingMasterParam, 'itemId') {}
export class QuestMaster extends SingleValuedMasterCacheData(QuestMasterParam, 'questId') {}
export class ScroungeMaster extends NestedSingleValuedMasterCacheData(ScroungeMasterParam, 'digimonId', 'scroungeId') {}
export class SkillDetailMaster extends NestedOrderedMultiValuedMasterCacheData(SkillDetailMasterParam, 'skillId', 'level', 'sequence') {}
class SkillLevelupItemMasterByGenealogy extends NestedSingleValuedMasterCacheData(SkillLevelupItemMasterParam, 'categoryValue', 'stoneType') {}
export class SkillLevelupItemMaster extends SingleValuedMasterCacheData(SkillLevelupItemMasterParam, 'itemId') {
	byGenealogy: SkillLevelupItemMasterByGenealogy
	constructor(data: {masterRows: Stringy<KeysToSnakeCase<SkillLevelupItemMasterParam>>[]}) {
		super(data)
		this.byGenealogy = new SkillLevelupItemMasterByGenealogy({masterRows: data.masterRows.filter(r => r.category === '2')})
	}
}
export class SkillMaster extends NestedSingleValuedMasterCacheData(SkillMasterParam, 'skillId', 'level') {}
export class SlbParameterMaster extends NestedSingleValuedMasterCacheData(SlbParameterMasterParam, 'parameterPatternId', 'level') {}
export class SlbParameterPatternMaster extends NestedSingleValuedMasterCacheData(SlbParameterPatternMasterParam, 'generation', 'personalityType') {}
export class TamerLevelMaster extends SingleValuedMasterCacheData(TamerLevelMasterParam, 'level') {}
export class TextMaster extends SingleValuedMasterCacheData(TextMasterParam, 'textId') {}
export class TrainingItemMaster extends SingleValuedMasterCacheData(TrainingItemMasterParam, 'itemId') {}
export class TrainingItemMaterialMaster extends MultiValuedMasterCacheData(TrainingItemMaterialMasterParam, 'compositionId') {}
export class TrainingMaster extends SingleValuedMasterCacheData(TrainingMasterParam, 'trainingId') {}
export class TrainingUseItemMaster extends MultiValuedMasterCacheData(TrainingUseItemMasterParam, 'trainingId') {}
export class WeeklyLimitMaster extends NestedOrderedMultiValuedMasterCacheData(WeeklyLimitMasterParam, 'sectionId', 'activeOrder') {}
export class WeeklyLimitCountMaster extends SingleValuedMasterCacheData(WeeklyLimitCountMasterParam, 'countId') {}
export class WeeklyLimitOpenMaster extends MultiValuedMasterCacheData(WeeklyLimitOpenMasterParam, 'openId') {}
export class WeeklyQuestMaster extends SingleValuedMasterCacheData(WeeklyQuestMasterParam, 'weeklyQuestId') {}

interface MasterManifestData {
	masterName: string
	className: string
	hashName: string
	crc: number  // uint32
	size: number  // uint32
}
export interface MasterManifest {
	version: string
	masters: MasterManifestData[]
}

interface ResourceInfo {
	name: string
	hash: string
	size: number  // uint32
	crc: number  // uint32
	dependencies: string[]
}
export interface ResourceManifest {
	version: string
	resources: ResourceInfo[]
}
