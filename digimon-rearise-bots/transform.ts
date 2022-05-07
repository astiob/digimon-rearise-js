import {isDeepStrictEqual} from 'util'

import type * as api from './apitypes'
import type * as master from './master'
import {AwaitedMasters, Masters, ServerName, servers} from './server'
import {MapToIndex, MapToPromise, ValueType, now} from './util'
import * as t9n from './translation'

export type PerServer<T> = { [SN in ServerName]?: T }
export type CompactPerServer<T> = T | PerServer<T>
function compactPerServer<T>(value: PerServer<T>): CompactPerServer<T> | undefined {
	if (isDeepStrictEqual(value.jp, value.ww))
		return value.jp!
	else
		return value
}
function compactNullablePerServer<T>(value: PerServer<T>): CompactPerServer<T> | undefined {
	if (!value.jp && !value.ww)
		return
	else if (isDeepStrictEqual(value.jp, value.ww))
		return value.jp!
	else if (value.jp && value.ww)
		return value
	else
		return {jp: value.jp || undefined, ww: value.ww || undefined}
}
function mapPerServer<T, U extends object | string | number>(source: PerServer<T>, transform: (value: T) => U): PerServer<U> {
	const result: PerServer<U> = {}
	if (source.jp != null)
		result.jp = transform(source.jp)
	if (source.ww != null)
		result.ww = transform(source.ww)
	return result
}

function unifyJsonEqualSubobjects<T>(value: T): T {
	const cache = new Map<string, any>()
	function recurse(thing: any): any {
		if (typeof thing !== 'object' || thing === null)
			return thing
		const json = JSON.stringify(thing)
		if (cache.has(json))
			return cache.get(json)
		if (thing instanceof Array)
			thing = thing.map(recurse)
		else if (!(thing instanceof Number || thing instanceof String || thing instanceof Boolean || thing instanceof Date))
			thing = Object.fromEntries(Object.entries(thing).map(([k, v]) => [k, recurse(v)]))
		cache.set(json, thing)
		return thing
	}
	return recurse(value)
}

interface UnifiedDigimonMasterParam {
	digimonId: number
	code: string
	name: t9n.InternationalizedString
	attackType: number
	personalityType: number
	growthType: PerServer<number>
	generation: number
	dna: number
	attribute?: number
	type?: number
	evolutionaryType: number
	defaultMaxLevel: number
	defaultMaxFriendshipLevel: number
	modelAsset: string
	iconAsset: string
	emotionIconAsset: string
	normalAttackSkillId: number
	exSkillId?: number
	mainSkillId?: number
	subskillId?: number
	passiveSkillId: number
	friendSkillId: number
	isLimited: boolean
	sellingPrice: number
	dotIconAsset: string
	wholeImageAsset: string | null
	pickupPluginAsset: string
	voiceType: number
	genealogy: number
	maxLevel: number
	evolve?: TransformedEvolve | TransformedChildhoodEvolve
	limitbreak: PerServer<TransformedLimitbreak[]>
}

export interface TransformedLimitbreak {
	level: number
	hp: number
	attack: number
	defense: number
	speed: number
	training: {
		hp: number
		attack: number
		defense: number
		speed: number
	}
}

export interface TransformedDigimonParameter {
	level: number
	hp: number
	attack: number
	defense: number
	speed: number
}

interface UnifiedSkill {
	name: t9n.InternationalizedString
	detail: PerServer<{
		maxCoolTime: number
		minCoolTime: number
		iconAsset: string
		detail: ValueType<master.SkillDetailMaster>
	}>
}

export interface TransformedSkillDetail {
	maxCoolTime: number
	minCoolTime: number
	iconAsset: string
	combinedDescription: string[]
}

interface TransformedSkill {
	name: number
	detail: CompactPerServer<TransformedSkillDetail>
}

interface UnifiedItem {
	name: t9n.InternationalizedString
	iconAsset: string
}

interface TransformedItem {
	name: number
	iconAsset: string
}

type UnifiedPluginParameters = ValueType<ValueType<master.PluginParameterMaster>>

export interface TransformedTargetPlugin {
	itemId: number
	targetParameters: {
		parameterType: number
		parameterValue: number
		valueType: number
	}[]
}

export interface TransformedChildhoodEvolve {
	prevDigimonId: number
}

export interface TransformedEvolve {
	level: number
	prevDigimonId: number
	useItem: {
		itemId: number
		num: number
	}[]
}

interface TransformedDigimon {
	name: number
	attackType?: number
	personalityType?: number
	growthType?: CompactPerServer<number>
	generation?: number
	dna: number
	attribute?: number
	type?: number
	// modelAsset?: string
	iconAsset?: string | number
	wholeImageAsset?: string | number | null
	genealogy?: number
	exSkill?: TransformedSkill
	mainSkill?: TransformedSkill
	subskill?: TransformedSkill
	passiveSkill?: TransformedSkill
	friendSkillName?: number
	targetPlugins?: TransformedTargetPlugin[]
	maxLevel?: number
	evolve?: TransformedEvolve | TransformedChildhoodEvolve
	limitbreak?: CompactPerServer<TransformedLimitbreak[]>
}

interface TransformedSlbParameterPatternMaster {
	[generationPersonality: string]: number
}

export interface TransformedSlbParameter {
	[level: number]: {
		hp: number
		attack: number
		defense: number
		speed: number
	}
}

interface TransformedSlbParameterMaster {
	[parameterPatternId: number]: TransformedSlbParameter
}

export interface TransformedData {
	names: t9n.CompactInternationalizedString[]
	personalities: t9n.CompactInternationalizedString[]
	dnas: t9n.CompactInternationalizedString[]
	attributes: t9n.CompactInternationalizedString[]
	types: [
		(t9n.CompactInternationalizedString | null)[],
		{ [type: number]: t9n.CompactInternationalizedString },
	]
	digimon: { [digimonId: number]: TransformedDigimon }
	items: { [itemId: number]: TransformedItem }
	growth: { [growthType: number]: CompactPerServer<TransformedDigimonParameter[]> }
	slbParameterPattern: TransformedSlbParameterPatternMaster
	slbParameter: TransformedSlbParameterMaster
}

const digimonIdBlacklist = new Set([
	1166102, 1166103,
	1144200, 1144201, 1144202, 1144203, 1144204,
	1145200, 1145201, 1145202, 1145203, 1145204,
	1146400, 1146401, 1146402, 1146403, 1146404,
	1147100, 1147101, 1147102, 1147103, 1147104,
	1148400, 1148401, 1148402, 1148403, 1148404,
	1149300, 1149301, 1149302, 1149303, 1149304,
	1999100,
])

export default async function transformMasters(): Promise<TransformedData> {
	let masterPromises = []
	for (const [serverName, server] of Object.entries(servers)) {
		for (const [stringyLanguage, masters] of Object.entries(server.masters)) {
			masterPromises.push(masters.cacheDate.then(cacheDate => ({
				serverName: serverName as ServerName,
				lang: t9n.languageTagFromCodeType[+stringyLanguage as api.LanguageCodeType],
				cacheDate,
				masters,
			})))
		}
	}

	const masters = await Promise.all(masterPromises)
	masters.sort((a, b) => {
		// first JP, then newer WW, then older WW
		if (a.serverName !== b.serverName)
			return a.serverName.localeCompare(b.serverName)
		return +b.cacheDate - +a.cacheDate
	})

	// console.log(masters.map(x => [x.serverName, x.lang, x.cacheDate]))

	function orderedMasters<Keys extends (keyof Masters)[]>(...keys: Keys): Promise<[ServerName, t9n.LanguageTag, ...MapToIndex<AwaitedMasters, Keys>][]> {
		console.log(`[${now()}] orderedMasters(${keys}) called`)
		return Promise.all(masters.map(async x => {
			const promises = keys.map(key => x.masters[key]) as MapToPromise<MapToIndex<AwaitedMasters, Keys>>
			const promise = Promise.all(promises) as Promise<MapToIndex<AwaitedMasters, Keys>>
			const tuple = [x.serverName, x.lang, ...await promise] as [ServerName, t9n.LanguageTag, ...MapToIndex<AwaitedMasters, Keys>]
			return tuple
		})).then(x => {
			console.log(`[${now()}] orderedMasters(${keys}) resolving`)
			return x
		})
	}

	const allGrowth = new Map<number, PerServer<TransformedDigimonParameter[]>>()
	for (const [serverName, _lang, digimonParameterMaster] of await orderedMasters('digimonParameter')) {
		for (const [growthType, growth] of digimonParameterMaster) {
			let unifiedGrowth = allGrowth.get(growthType)
			if (!unifiedGrowth)
				allGrowth.set(growthType, unifiedGrowth = {})
			if (!unifiedGrowth[serverName] && growth.some(p => p.hp || p.attack || p.defense || p.speed)) {
				unifiedGrowth[serverName] = growth.map(p => ({
					level: p.level,
					hp: p.hp,
					attack: p.attack,
					defense: p.defense,
					speed: p.speed,
				}))
			}
		}
	}

	const allDigimon = new Map<number, UnifiedDigimonMasterParam>()
	const allItemIds = new Set<number>()
	const allTypeIds = new Set<number>()
	for (const [serverName, lang, assetCanonicalization, childhoodEvolveMaster, digimonMaster, digimonBookMaster, digimonSkillMaster, evolveMaster, evolveUseItemMaster, limitbreakMaster, limitbreakGroupMaster, trainingMaster] of await orderedMasters('assetCanonicalization', 'childhoodEvolve', 'digimon', 'digimonBook', 'digimonSkill', 'evolve', 'evolveUseItem', 'limitbreak', 'limitbreakGroup', 'training')) {
		for (const [digimonId, digimon] of digimonMaster) {
			let unifiedDigimon = allDigimon.get(digimonId)
			if (~~(digimonId / 1000000) !== 1 || digimonIdBlacklist.has(digimonId) || lang !== 'ja' && digimon.name === unifiedDigimon?.name.ja)
				continue
			// if (!digimonSkillMaster.has(digimonId) || !limitbreakMaster.has(digimonId)) {
			// 	console.log(`Skipping Digimon ${digimonId} with incomplete data`)
			// 	continue
			// }
			if (!unifiedDigimon) {
				let maxLevel = digimon.defaultMaxLevel
				const evolve = evolveMaster.byNext.get(digimonId)
				if (evolve)
					maxLevel = Math.max(maxLevel, evolve.level) + evolve.addMaxLevel
				for (const limitbreak of limitbreakMaster.get(digimonId)?.values() ?? [])
					if (limitbreak.necessaryLevel <= maxLevel)
						maxLevel = Math.max(maxLevel, limitbreak.limitLevel)
				const type = digimonBookMaster.get(digimon.code)?.type
				if (type !== undefined)
					allTypeIds.add(type)
				let childhoodEvolve
				allDigimon.set(digimonId, unifiedDigimon = {
					...digimon,
					iconAsset: assetCanonicalization[digimon.iconAsset] ?? `0/${digimon.iconAsset}` /* TODO */,
					wholeImageAsset: assetCanonicalization[digimon.wholeImageAsset] ?? null,
					attribute: digimonBookMaster.get(digimon.code)?.attribute,
					type,
					exSkillId: digimonSkillMaster.get(digimonId)?.get(2)?.skillId,
					mainSkillId: digimonSkillMaster.get(digimonId)?.get(0)?.skillId,
					subskillId: digimonSkillMaster.get(digimonId)?.get(1)?.skillId,
					name: {},
					growthType: {},
					maxLevel,
					evolve: evolve ? {
						level: evolve.level,
						prevDigimonId: evolve.digimonId,
						useItem: evolveUseItemMaster.get(evolve.evolveUseItemId)!.map(evolveUseItem => {
							allItemIds.add(evolveUseItem.itemId)
							return {
								itemId: evolveUseItem.itemId,
								num: evolveUseItem.num,
							}
						}),
					} : (childhoodEvolve = childhoodEvolveMaster.byNext.get(digimonId)) && {
						prevDigimonId: childhoodEvolve.prevDigimonId,
					},
					limitbreak: {},
				})
				if (unifiedDigimon.evolve && unifiedDigimon.evolve.prevDigimonId >= digimonId)
					console.warn(`Digimon ${digimonId} evolves from a Digimon with bigger ID ${unifiedDigimon.evolve.prevDigimonId}`)
			}
			unifiedDigimon.name[lang] = digimon.name
			unifiedDigimon.growthType[serverName] ??= digimon.growthType
			if (!unifiedDigimon.limitbreak[serverName]) {
				let masterLimitbreaks = [...(limitbreakMaster.get(digimonId)?.values() ?? [])]
				masterLimitbreaks.sort((a, b) => a.necessaryLimitbreakCount - b.necessaryLimitbreakCount)
				const limitbreaks: TransformedLimitbreak[] = unifiedDigimon.limitbreak[serverName] = []
				for (const limitbreak of masterLimitbreaks) {
					if (limitbreak.necessaryLevel > unifiedDigimon.maxLevel)
						continue
					const trainingRise = {
						hp: 0,
						attack: 0,
						defense: 0,
						speed: 0,
					}
					for (const groupTraining of limitbreakGroupMaster.get(limitbreak.trainingGroupId)!) {
						const training = trainingMaster.get(groupTraining.trainingId)!
						trainingRise.hp += training.risingHp
						trainingRise.attack += training.risingAttack
						trainingRise.defense += training.risingDefense
						trainingRise.speed += training.risingSpeed
					}
					limitbreaks.push({
						level: limitbreak.necessaryLevel,
						hp: limitbreak.risingHp,
						attack: limitbreak.risingAttack,
						defense: limitbreak.risingDefense,
						speed: limitbreak.risingSpeed,
						training: trainingRise,
					})
				}
			}
		}
	}

	const allSkills = new Map<number, UnifiedSkill>()
	for (const [serverName, lang, assetCanonicalization, skillMaster, skillDetailMaster] of await orderedMasters('assetCanonicalization', 'skill', 'skillDetail')) {
		for (const [skillId, levels] of skillMaster) {
			const slv1 = levels.get(1)
			const slv10 = levels.get(10)
			let unifiedSkill = allSkills.get(skillId)
			if (!slv1 || !slv10 || lang !== 'ja' && slv1.name === unifiedSkill?.name.ja)
				continue
			if (!unifiedSkill)
				allSkills.set(skillId, unifiedSkill = {
					name: {},
					detail: {},
				})
			unifiedSkill.name[lang] = slv1.name
			unifiedSkill.detail[serverName] ??= {
				maxCoolTime: slv1.coolTime,
				minCoolTime: slv10.coolTime,
				iconAsset: assetCanonicalization[slv10.iconAsset] ?? `0/${slv10.iconAsset}` /* TODO */,
				detail: skillDetailMaster.get(skillId)!,
			}
		}
	}

	const exclusivePluginIds = new Set<number>()
	const targetPluginIds = new Map<number, number[]>()
	const allPluginParameters = new Map<number, UnifiedPluginParameters>()
	// for (const [_serverName, _lang, itemMaster, pluginEvolveMaster, pluginParameterMaster, pluginWearingMaster] of await orderedMasters('item', 'pluginEvolve', 'pluginParameter', 'pluginWearing')) {
	for (const [_serverName, _lang, pluginEvolveMaster, pluginParameterMaster, pluginWearingMaster] of await orderedMasters('pluginEvolve', 'pluginParameter', 'pluginWearing')) {
		for (const [itemId, pluginWearings] of pluginWearingMaster) {
			for (const pluginWearing of pluginWearings) {
				if (pluginWearing.wearingType === 5 && !pluginEvolveMaster.has(itemId)) {
					// const item = itemMaster.get(itemId)!
					const unifiedPluginParameters = allPluginParameters.get(itemId)
					// if (lang !== 'ja' && item.itemName === unifiedPlugin?.name.ja)
					// 	continue

					const digimonId = pluginWearing.wearingValue

					const array = targetPluginIds.get(digimonId)
					if (array)
						array.push(itemId)
					else
						targetPluginIds.set(digimonId, [itemId])

					exclusivePluginIds.add(itemId)
					allItemIds.add(itemId)

					if (unifiedPluginParameters) {
						for (const [wearerId, params] of pluginParameterMaster.get(itemId)!.get(5)!)
							if (!unifiedPluginParameters.has(wearerId))
								unifiedPluginParameters.set(wearerId, params)
					} else
						allPluginParameters.set(itemId, new Map(pluginParameterMaster.get(itemId)!.get(5)!))
				}
			}
		}
		for (const [itemId, strengthenChain] of pluginParameterMaster) {
			if (pluginEvolveMaster.has(itemId))
				continue

			const strongestParams = strengthenChain.get(5)
			if (!strongestParams)
				// plugin booster
				continue

			// const item = itemMaster.get(itemId)!
			let unifiedPluginParameters = allPluginParameters.get(itemId)
			// if (lang !== 'ja' && item.itemName === unifiedPlugin?.name.ja)
			// 	continue

			allItemIds.add(itemId)

			if (!unifiedPluginParameters)
				allPluginParameters.set(itemId, unifiedPluginParameters = new Map)

			for (const [digimonId, params] of strongestParams) {
				if (!unifiedPluginParameters.has(digimonId))
					unifiedPluginParameters.set(digimonId, params)

				if (digimonId) {
					const array = targetPluginIds.get(digimonId)
					if (array)
						array.push(itemId)
					else
						targetPluginIds.set(digimonId, [itemId])
				}
			}
		}
	}
	for (const itemIds of targetPluginIds.values()) {
		itemIds.splice(0, itemIds.length, ...new Set(itemIds))
		itemIds.sort((a, b) => +exclusivePluginIds.has(a) - +exclusivePluginIds.has(b) || a - b)
	}

	const allItems = new Map<number, UnifiedItem>()
	for (const [_serverName, lang, assetCanonicalization, itemMaster] of await orderedMasters('assetCanonicalization', 'item')) {
		for (const [itemId, item] of itemMaster) {
			if (!allItemIds.has(itemId))
				continue

			const unifiedItem = allItems.get(itemId)
			if (lang !== 'ja' && item.itemName === unifiedItem?.name.ja)
				continue

			if (unifiedItem)
				unifiedItem.name[lang] = item.itemName
			else
				allItems.set(itemId, {
					name: {[lang]: item.itemName},
					iconAsset: assetCanonicalization[item.iconAsset] ?? `0/${item.iconAsset}` /* TODO */,
				})
		}
	}

	const transformedSlbParameterPattern: TransformedSlbParameterPatternMaster = {}
	for (const [_serverName, _lang, slbParameterPatternMaster] of await orderedMasters('slbParameterPattern')) {
		for (const [generation, patternByPersonality] of slbParameterPatternMaster) {
			for (const [personalityType, pattern] of patternByPersonality) {
				if (transformedSlbParameterPattern[`${[generation,personalityType]}`] == null)
					transformedSlbParameterPattern[`${[generation,personalityType]}`] = pattern.parameterPatternId
			}
		}
	}

	const transformedSlbParameter: TransformedSlbParameterMaster = {}
	for (const [_serverName, _lang, slbParameterMaster] of await orderedMasters('slbParameter')) {
		for (const [parameterPatternId, parametersByLevel] of slbParameterMaster) {
			for (const [level, parameters] of parametersByLevel) {
				let transformed = transformedSlbParameter[parameterPatternId]
				if (transformed === undefined)
					transformedSlbParameter[parameterPatternId] = transformed = {}
				if (!(level in transformed))
					transformed[level] = {
						hp: parameters.addHp,
						attack: parameters.addAttack,
						defense: parameters.addDefense,
						speed: parameters.addSpeed,
					}
			}
		}
	}

	const personalities: t9n.InternationalizedString[] = []
	for (const [_serverName, lang, personalityTypeMaster] of await orderedMasters('personalityType')) {
		for (const personality of personalityTypeMaster.values()) {
			const unifiedPersonality = personalities[personality.personalityType - 1]
			if (unifiedPersonality)
				unifiedPersonality[lang] = personality.name
			else
				personalities[personality.personalityType - 1] = {[lang]: personality.name}
		}
	}

	let maxType = -1
	for (const type of allTypeIds)
		if (type < 1000 && type > maxType)
			maxType = type

	const dnas: t9n.InternationalizedString[] = []
	const attributes: t9n.InternationalizedString[] = []
	const regularTypes: (t9n.InternationalizedString | null)[] = []
	const irregularTypes: { [type: number]: t9n.InternationalizedString } = {}
	for (const [_serverName, lang, textMaster] of await orderedMasters('text')) {
		for (let dna = 1; dna <= 9; ++dna) {
			const text = textMaster.get(753 + dna)!
			const unifiedDna = dnas[dna - 1]
			if (unifiedDna)
				unifiedDna[lang] = text.text
			else
				dnas[dna - 1] = {[lang]: text.text}
		}
		for (let attribute = 0; attribute <= 6; ++attribute) {
			const text = attribute < 6 ? textMaster.get(900000 + attribute)! : {text: ''}
			const unifiedAttribute = attributes[attribute]
			if (unifiedAttribute)
				unifiedAttribute[lang] = text.text
			else
				attributes[attribute] = {[lang]: text.text}
		}
		for (let type = 0; type <= maxType; ++type) {
			if (!allTypeIds.has(type)) {
				regularTypes[type] = null
				continue
			}
			const text = textMaster.get(910000 + type - +(type >= 4 /* FIXME */))
			if (text === undefined)
				throw new Error(`Text not found for Digimon type ${type} in language ${lang}`)
			const unifiedType = regularTypes[type]
			if (unifiedType)
				unifiedType[lang] = text.text
			else
				regularTypes[type] = {[lang]: text.text}
		}
		for (const type of allTypeIds) {
			if (type >= 1000) {
				const text = textMaster.get(type)
				if (text !== undefined) {
					const unifiedType = irregularTypes[type]
					if (unifiedType)
						unifiedType[lang] = text.text
					else
						irregularTypes[type] = {[lang]: text.text}
				}
			}
		}
	}
	for (const type of allTypeIds) {
		if (type >= 1000) {
			if (!(type in irregularTypes))
				throw new Error(`No text found for Digimon type ${type} in any language`)
		}
	}

	const transformedNames: t9n.CompactInternationalizedString[] = []
	const transformedNameIndex = new Map<string, number>()
	function addName(name: t9n.InternationalizedString): number {
		const key = JSON.stringify(name)
		let i = transformedNameIndex.get(key)
		if (i === undefined) {
			transformedNameIndex.set(key, i = transformedNames.length)
			transformedNames.push(t9n.compactInternationalizedString(name))
		}
		return i
	}
	function addNameMaybe(name: t9n.InternationalizedString | undefined): number | undefined {
		return name && addName(name)
	}

	function compactAsset(canonicalPath: string, defaultPath: string): string | number | undefined
	function compactAsset(canonicalPath: string | null, defaultPath: string | null): string | number | null | undefined
	function compactAsset(canonicalPath: string | null, defaultPath: string | null): string | number | null | undefined {
		if (canonicalPath === null || defaultPath === null)
			return canonicalPath !== defaultPath ? canonicalPath : undefined
		else if (canonicalPath === `${parseInt(canonicalPath)}/${defaultPath}`)
			return parseInt(canonicalPath) || undefined
		else
			return canonicalPath
	}

	function transformSkill(skillId: number | undefined): TransformedSkill | undefined {
		if (skillId === undefined)
			return
		const skill = allSkills.get(skillId)
		if (!skill)
			return
		return {
			name: addName(skill.name),
			detail: compactPerServer(mapPerServer(skill.detail, d => ({
				maxCoolTime: d.maxCoolTime,
				minCoolTime: d.minCoolTime,
				iconAsset: d.iconAsset,
				combinedDescription: [],  // FIXME
			})))!,
		}
	}

	const transformedDigimon: { [digimonId: number]: TransformedDigimon } = {}
	console.log(`[${now()}] before allDigimon loop`)
	for (const [digimonId, unifiedDigimon] of allDigimon) {
		t9n.synthesizeEnName(unifiedDigimon.name)
		const growthType = compactPerServer(unifiedDigimon.growthType)!
		if (~~(digimonId / 1000) % 1000 !== unifiedDigimon.genealogy)
			console.warn(`Digimon ${digimonId} has weird genealogy ${unifiedDigimon.genealogy}`)
		transformedDigimon[digimonId] = {
			name: addName(unifiedDigimon.name),
			attackType: unifiedDigimon.personalityType % 3 !== unifiedDigimon.attackType ? unifiedDigimon.attackType : undefined,
			personalityType: ~~(digimonId / 100) % 10 !== unifiedDigimon.personalityType ? unifiedDigimon.personalityType : undefined,
			growthType: (unifiedDigimon.generation < 2 ? 1 : digimonId) !== growthType ? growthType : undefined,
			generation: digimonId % 10 !== unifiedDigimon.generation ? unifiedDigimon.generation : undefined,
			dna: unifiedDigimon.dna,
			attribute: unifiedDigimon.attribute,
			type: unifiedDigimon.type,
			// modelAsset: unifiedDigimon.modelAsset,
			iconAsset: compactAsset(unifiedDigimon.iconAsset, `digimon/icon/digimonface${digimonId}`),
			wholeImageAsset: compactAsset(unifiedDigimon.wholeImageAsset, unifiedDigimon.generation >= 3 ? `digimon/whole/digimonbody${digimonId}` : null),
			genealogy: ~~(digimonId / 1000) % 1000 !== unifiedDigimon.genealogy ? unifiedDigimon.genealogy : undefined,
			exSkill: transformSkill(unifiedDigimon.exSkillId),
			mainSkill: transformSkill(unifiedDigimon.mainSkillId),
			subskill: transformSkill(unifiedDigimon.subskillId),
			passiveSkill: transformSkill(unifiedDigimon.passiveSkillId),
			friendSkillName: unifiedDigimon.friendSkillId !== unifiedDigimon.mainSkillId ? addNameMaybe(allSkills.get(unifiedDigimon.friendSkillId)?.name) : undefined,
			targetPlugins: targetPluginIds.get(digimonId)?.map(itemId => {
				const unifiedPluginParameters = allPluginParameters.get(itemId)!
				const params = unifiedPluginParameters.get(digimonId) ?? unifiedPluginParameters.get(0)!
				return {
					itemId,
					targetParameters: params.map(param => ({
						parameterType: param.parameterType,
						parameterValue: param.parameterValue,
						valueType: param.valueType,
					}))
				}
			}),
			maxLevel: unifiedDigimon.maxLevel !== 99 ? unifiedDigimon.maxLevel : undefined,
			evolve: unifiedDigimon.evolve,
			limitbreak: compactNullablePerServer(unifiedDigimon.limitbreak),
		}
	}
	console.log(`[${now()}] after allDigimon loop`)

	const transformedItems: { [itemId: number]: TransformedItem } = {}
	for (const [itemId, unifiedItem] of allItems) {
		t9n.synthesizeEnName(unifiedItem.name)
		transformedItems[itemId] = {
			name: addName(unifiedItem.name),
			iconAsset: unifiedItem.iconAsset,
		}
	}
	console.log(`[${now()}] after allItems loop`)

	return unifyJsonEqualSubobjects({
		names: transformedNames,
		personalities: personalities.map(t9n.compactInternationalizedString),
		dnas: dnas.map(t9n.compactInternationalizedString),
		attributes: attributes.map(t9n.compactInternationalizedString),
		types: [
			regularTypes.map(t => t && t9n.compactInternationalizedString(t)),
			Object.fromEntries(Object.entries(irregularTypes).map(([n, t]) => [n, t9n.compactInternationalizedString(t)])),
		],
		digimon: transformedDigimon,
		items: transformedItems,
		growth: Object.fromEntries([...allGrowth].map(([k, v]) => [k, compactPerServer(v)!])),
		slbParameterPattern: transformedSlbParameterPattern,
		slbParameter: transformedSlbParameter,
	})
}
// transformMasters().then(x => console.log(x))
