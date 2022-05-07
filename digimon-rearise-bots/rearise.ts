import crypto from 'crypto'
import solver from 'javascript-lp-solver'
import {promises as fs} from 'fs'
import type * as https from 'https'
import mysql from 'mysql2/promise'
import {SocksProxyAgent} from 'socks-proxy-agent'
import tunnel from 'tunnel'
import {isDeepStrictEqual} from 'util'

import * as api from './apitypes'
import {DigiriseError, DigiriseSession, User, error, hasSpecificEvolutionCode, itemCount, keepGoing, log, mainJpUser, run, searchGlobalUser, sleep, stripResponse} from './client'
import {caCertificatePath, db as dbConfig} from './config.json'
import * as master from './master'
import {Masters, Server, servers} from './server'
import * as t9n from './translation'
import {parseDate, parseTime} from './util'
import type {ValueType} from './util'

async function feedDigimonForFriendship<ConstrainedLanguageCodeType extends api.LanguageCodeType>(session: DigiriseSession<ConstrainedLanguageCodeType>, masters: Masters, digimon: api.UserDigimon, isCheapDigimon: boolean, friendshipPointToAdd: number) {
	const lastCareTime = Date.parse(digimon.lastCareTime)
	const digimonMaster = await masters.digimon
	const generation = digimonMaster.get(digimon.digimonId)!.generation
	const motivationThreshold = (await masters.motivationThreshold).get(generation)!
	const scrounges = (await masters.scrounge).get(digimon.digimonId)!
	const appConstantMaster = await masters.appConstant
	const partnerInfluenceFriendshipValueRate = Math.fround(1 + Math.fround(+appConstantMaster.get('DIGIMON')!.get('PARTNER_INFLUENCE_FRIENDSHIP_VALUE_RATE')!.value / 100))
	const partnerInfluenceMoodValueRate = Math.fround(1 + Math.fround(+appConstantMaster.get('DIGIMON')!.get('PARTNER_INFLUENCE_MOOD_VALUE_RATE')!.value / 100))
	let currentMood = Math.max(0, Math.fround(digimon.moodValue - (await masters.digimonDecreaseMotivation).get(generation)!.decreaseValue * (3000 + Date.now() - lastCareTime) / 3600000))
	// await session.digimonCare(digimon.userDigimonId, 98, 98, 98, 98, 98, 98, 98, 98, 24])
	// await session.digimonCare(digimon.userDigimonId, [14, 14, 14])
	// TODO feed several items in a row to determine influence rounding
	// TODO feed at controlled intervals to determine decay rounding
	// TODO take into account current scrounge requests
	let useItemIdList = []
	let addedFriendshipPoint = 0
	while (friendshipPointToAdd > 0) {
		let bestItemId: number | undefined, bestFriendshipPointRise
		const currentMotivation = currentMood / 100 <= motivationThreshold.normalThreshold ? 3 : currentMood / 100 <= motivationThreshold.goodThreshold ? 2 : 1
		const careInfluence = (await masters.careInfluence).get(currentMotivation)!
		const itemMaster = await masters.item
		for (const scrounge of scrounges.values()) {
			const itemId = scrounge.itemId
			if (isCheapDigimon && itemId < 10 || !itemCount(session.userData, +itemId))
				continue
			const friendshipPointRise = Math.fround(itemMaster.get(itemId)!.friendshipPointRiseValue * Math.fround(partnerInfluenceFriendshipValueRate + Math.fround(careInfluence.influenceFriendshipRate / 100))) | 0
			if (bestFriendshipPointRise !== undefined) {
				if (friendshipPointRise > bestFriendshipPointRise && bestFriendshipPointRise >= friendshipPointToAdd)
					continue
				if (friendshipPointRise < bestFriendshipPointRise && friendshipPointRise < friendshipPointToAdd)
					continue
			}
			bestItemId = itemId
			bestFriendshipPointRise = friendshipPointRise
		}
		if (bestItemId === undefined || bestFriendshipPointRise === undefined)
			throw new Error('Not enough favorite food!')
		useItemIdList.push(bestItemId)
		friendshipPointToAdd -= bestFriendshipPointRise
		addedFriendshipPoint += bestFriendshipPointRise
		currentMood += Math.fround(itemMaster.get(bestItemId)!.moodValueRiseValue * Math.fround(partnerInfluenceMoodValueRate + Math.fround(careInfluence.influenceMoodValueRate / 100))) | 0
		session.userData.userItemList.find(item => item.itemId === bestItemId)!.count--
	}
	log(`Feeding ${digimonMaster.get(digimon.digimonId)!.name} (${(await masters.personalityType).get(digimonMaster.get(digimon.digimonId)!.personalityType)!.name}) #${digimon.userDigimonId}: [${useItemIdList.join(", ")}]...`)
	digimon.lastCareTime = new Date().toISOString()
	await session.digimonCare(digimon.userDigimonId, useItemIdList)
	digimon.moodValue = currentMood
	digimon.friendshipPoint = Math.min(digimon.friendshipPoint + addedFriendshipPoint, (await masters.digimonFriendshipLevel).get(digimonMaster.get(digimon.digimonId)!.evolutionaryType)!.get(digimon.maxFriendshipLevel)!.totalFriendshipPoint)
}

const digimonParameterList: Record<number, api.BattleLogParameterInfo[]> = {
	7001: [
		{
			"userDigimonId": 87240530,
			"parameterHash": "2df984d0643d8a08ee0c9dbe525154b8",
			"parameterRaw": "",
			"battleDigimonDetail": {
				"userDigimonId": 87240530,
				"digimonId": 1223404,
				"awakingLevel": 0,
				"generation": 4,
				"level": 99,
				"friendshipPoint": 406290,
				"friendshipLevel": 99,
				"moodValue": 100,
				"skillLevel": 5,
				"executionLimitbreakId": 0,
				"completeTrainingIds": [],
				"lastBrokenSlbNecessaryLevel": 0,
				"wearingPluginList": [
					{
						"slotId": 0,
						"userPluginId": 60732596,
						"pluginId": 252414005,
						"strengtheningValue": 5
					},
					{
						"slotId": 1,
						"userPluginId": 53383081,
						"pluginId": 153434005,
						"strengtheningValue": 5
					},
					{
						"slotId": 2,
						"userPluginId": 61634431,
						"pluginId": 344055,
						"strengtheningValue": 5
					},
					{
						"slotId": 3,
						"userPluginId": 26882007,
						"pluginId": 112414005,
						"strengtheningValue": 5
					},
					{
						"slotId": 4,
						"userPluginId": 60732597,
						"pluginId": 252434005,
						"strengtheningValue": 5
					},
					{
						"slotId": 5,
						"userPluginId": 56343474,
						"pluginId": 344055,
						"strengtheningValue": 5
					}
				],
				"hp": 8279,
				"attack": 3084,
				"defense": 3022,
				"speed": 20
			}
		},
		{
			"userDigimonId": 61833432,
			"parameterHash": "17014cc5ce3d796a673999aea671d4db",
			"parameterRaw": "",
			"battleDigimonDetail": {
				"userDigimonId": 61833432,
				"digimonId": 1190206,
				"awakingLevel": 0,
				"generation": 6,
				"level": 99,
				"friendshipPoint": 406290,
				"friendshipLevel": 99,
				"moodValue": 95,
				"skillLevel": 3,
				"executionLimitbreakId": 0,
				"completeTrainingIds": [],
				"lastBrokenSlbNecessaryLevel": 0,
				"wearingPluginList": [
					{
						"slotId": 0,
						"userPluginId": 63671227,
						"pluginId": 163422005,
						"strengtheningValue": 5
					},
					{
						"slotId": 1,
						"userPluginId": 54208662,
						"pluginId": 360015,
						"strengtheningValue": 5
					},
					{
						"slotId": 2,
						"userPluginId": 31634129,
						"pluginId": 242135,
						"strengtheningValue": 5
					},
					{
						"slotId": 3,
						"userPluginId": 29078232,
						"pluginId": 118422005,
						"strengtheningValue": 5
					},
					{
						"slotId": 4,
						"userPluginId": 31634457,
						"pluginId": 332015,
						"strengtheningValue": 5
					},
					{
						"slotId": 5,
						"userPluginId": 44065260,
						"pluginId": 140135,
						"strengtheningValue": 5
					}
				],
				"hp": 10040,
				"attack": 5345,
				"defense": 2679,
				"speed": 30
			}
		},
		{
			"userDigimonId": 84709462,
			"parameterHash": "b27a9876a620e1bab03ab7938091afa1",
			"parameterRaw": "",
			"battleDigimonDetail": {
				"userDigimonId": 84709462,
				"digimonId": 1227502,
				"awakingLevel": 0,
				"generation": 2,
				"level": 99,
				"friendshipPoint": 406290,
				"friendshipLevel": 99,
				"moodValue": 100,
				"skillLevel": 1,
				"executionLimitbreakId": 0,
				"completeTrainingIds": [],
				"lastBrokenSlbNecessaryLevel": 0,
				"wearingPluginList": [
					{
						"slotId": 0,
						"userPluginId": 58217492,
						"pluginId": 239425005,
						"strengtheningValue": 5
					},
					{
						"slotId": 1,
						"userPluginId": 57961095,
						"pluginId": 239435005,
						"strengtheningValue": 5
					},
					{
						"slotId": 2,
						"userPluginId": 70044366,
						"pluginId": 445135,
						"strengtheningValue": 5
					},
					{
						"slotId": 3,
						"userPluginId": 67885450,
						"pluginId": 278425005,
						"strengtheningValue": 5
					},
					{
						"slotId": 4,
						"userPluginId": 61634406,
						"pluginId": 335015,
						"strengtheningValue": 5
					},
					{
						"slotId": 5,
						"userPluginId": 62270753,
						"pluginId": 345135,
						"strengtheningValue": 5
					}
				],
				"hp": 7589,
				"attack": 2614,
				"defense": 1876,
				"speed": 8
			}
		},
		{
			"userDigimonId": 113637362,
			"parameterHash": "65ce32755aa9adee503e5f4f120d6c8c",
			"parameterRaw": "",
			"battleDigimonDetail": {
				"userDigimonId": 113637362,
				"digimonId": 1267205,
				"awakingLevel": 0,
				"generation": 5,
				"level": 99,
				"friendshipPoint": 406290,
				"friendshipLevel": 99,
				"moodValue": 100,
				"skillLevel": 10,
				"executionLimitbreakId": 0,
				"completeTrainingIds": [],
				"lastBrokenSlbNecessaryLevel": 0,
				"wearingPluginList": [
					{
						"slotId": 0,
						"userPluginId": 70848314,
						"pluginId": 280422005,
						"strengtheningValue": 5
					},
					{
						"slotId": 1,
						"userPluginId": 59095002,
						"pluginId": 332035,
						"strengtheningValue": 5
					},
					{
						"slotId": 2,
						"userPluginId": 59095003,
						"pluginId": 242125,
						"strengtheningValue": 5
					},
					{
						"slotId": 3,
						"userPluginId": 61809100,
						"pluginId": 257422005,
						"strengtheningValue": 5
					},
					{
						"slotId": 4,
						"userPluginId": 61634398,
						"pluginId": 332015,
						"strengtheningValue": 5
					},
					{
						"slotId": 5,
						"userPluginId": 69933268,
						"pluginId": 280442015,
						"strengtheningValue": 5
					}
				],
				"hp": 9784,
				"attack": 10510,
				"defense": 3479,
				"speed": 27
			}
		},
		{
			"userDigimonId": 61445525,
			"parameterHash": "20516fd870df2cef23806e77ce011dc1",
			"parameterRaw": "",
			"battleDigimonDetail": {
				"userDigimonId": 61445525,
				"digimonId": 1192102,
				"awakingLevel": 0,
				"generation": 2,
				"level": 99,
				"friendshipPoint": 406290,
				"friendshipLevel": 99,
				"moodValue": 100,
				"skillLevel": 10,
				"executionLimitbreakId": 0,
				"completeTrainingIds": [],
				"lastBrokenSlbNecessaryLevel": 0,
				"wearingPluginList": [
					{
						"slotId": 0,
						"userPluginId": 19920144,
						"pluginId": 100411005,
						"strengtheningValue": 5
					},
					{
						"slotId": 1,
						"userPluginId": 54074397,
						"pluginId": 221431005,
						"strengtheningValue": 5
					},
					{
						"slotId": 2,
						"userPluginId": 44066006,
						"pluginId": 140135,
						"strengtheningValue": 5
					},
					{
						"slotId": 3,
						"userPluginId": 26816344,
						"pluginId": 107411005,
						"strengtheningValue": 5
					},
					{
						"slotId": 4,
						"userPluginId": 61634144,
						"pluginId": 331015,
						"strengtheningValue": 5
					},
					{
						"slotId": 5,
						"userPluginId": 44065973,
						"pluginId": 140135,
						"strengtheningValue": 5
					}
				],
				"hp": 6341,
				"attack": 2814,
				"defense": 1596,
				"speed": 23
			}
		},
	],
	7002: [
		{
			"userDigimonId": 41747371,
			"parameterHash": "38391ccbbc99500cd266380e447babae",
			"parameterRaw": "",
			"battleDigimonDetail": {
				"userDigimonId": 41747371,
				"digimonId": 1129302,
				"awakingLevel": 0,
				"generation": 2,
				"level": 99,
				"friendshipPoint": 406290,
				"friendshipLevel": 99,
				"moodValue": 100,
				"skillLevel": 10,
				"executionLimitbreakId": 0,
				"completeTrainingIds": [],
				"lastBrokenSlbNecessaryLevel": 0,
				"wearingPluginList": [
					{
						"slotId": 0,
						"userPluginId": 24325072,
						"pluginId": 119423005,
						"strengtheningValue": 5
					},
					{
						"slotId": 1,
						"userPluginId": 43170118,
						"pluginId": 169433005,
						"strengtheningValue": 5
					},
					{
						"slotId": 2,
						"userPluginId": 62270197,
						"pluginId": 343065,
						"strengtheningValue": 5
					},
					{
						"slotId": 3,
						"userPluginId": 39570447,
						"pluginId": 119423005,
						"strengtheningValue": 5
					},
					{
						"slotId": 4,
						"userPluginId": 70530102,
						"pluginId": 169433005,
						"strengtheningValue": 5
					},
					{
						"slotId": 5,
						"userPluginId": 59094983,
						"pluginId": 343125,
						"strengtheningValue": 5
					}
				],
				"hp": 9016,
				"attack": 2192,
				"defense": 2381,
				"speed": 42
			}
		},
		{
			"userDigimonId": 90814013,
			"parameterHash": "253e924564d53c6e5e8f6ad61aa4ad50",
			"parameterRaw": "",
			"battleDigimonDetail": {
				"userDigimonId": 90814013,
				"digimonId": 1197505,
				"awakingLevel": 0,
				"generation": 5,
				"level": 99,
				"friendshipPoint": 406290,
				"friendshipLevel": 99,
				"moodValue": 100,
				"skillLevel": 1,
				"executionLimitbreakId": 0,
				"completeTrainingIds": [],
				"lastBrokenSlbNecessaryLevel": 0,
				"wearingPluginList": [
					{
						"slotId": 0,
						"userPluginId": 59094999,
						"pluginId": 425025,
						"strengtheningValue": 5
					},
					{
						"slotId": 1,
						"userPluginId": 61634405,
						"pluginId": 335015,
						"strengtheningValue": 5
					},
					{
						"slotId": 2,
						"userPluginId": 75572904,
						"pluginId": 445135,
						"strengtheningValue": 5
					},
					{
						"slotId": 3,
						"userPluginId": 53217165,
						"pluginId": 159425005,
						"strengtheningValue": 5
					},
					{
						"slotId": 4,
						"userPluginId": 82583237,
						"pluginId": 320433005,
						"strengtheningValue": 5
					},
					{
						"slotId": 5,
						"userPluginId": 73391031,
						"pluginId": 445135,
						"strengtheningValue": 5
					}
				],
				"hp": 13708,
				"attack": 4867,
				"defense": 3285,
				"speed": 12
			}
		},
		{
			"userDigimonId": 41740279,
			"parameterHash": "38391ccbbc99500cd266380e447babae",
			"parameterRaw": "",
			"battleDigimonDetail": {
				"userDigimonId": 41740279,
				"digimonId": 1128302,
				"awakingLevel": 0,
				"generation": 2,
				"level": 99,
				"friendshipPoint": 406290,
				"friendshipLevel": 99,
				"moodValue": 100,
				"skillLevel": 10,
				"executionLimitbreakId": 0,
				"completeTrainingIds": [],
				"lastBrokenSlbNecessaryLevel": 0,
				"wearingPluginList": [
					{
						"slotId": 0,
						"userPluginId": 29078631,
						"pluginId": 119423005,
						"strengtheningValue": 5
					},
					{
						"slotId": 1,
						"userPluginId": 42954647,
						"pluginId": 168433005,
						"strengtheningValue": 5
					},
					{
						"slotId": 2,
						"userPluginId": 59094997,
						"pluginId": 343135,
						"strengtheningValue": 5
					},
					{
						"slotId": 3,
						"userPluginId": 31192271,
						"pluginId": 115413005,
						"strengtheningValue": 5
					},
					{
						"slotId": 4,
						"userPluginId": 70529722,
						"pluginId": 168433005,
						"strengtheningValue": 5
					},
					{
						"slotId": 5,
						"userPluginId": 56343479,
						"pluginId": 343065,
						"strengtheningValue": 5
					}
				],
				"hp": 9016,
				"attack": 2192,
				"defense": 2381,
				"speed": 42
			}
		},
		{
			"userDigimonId": 57337650,
			"parameterHash": "b370fcaaa35db00d8c84035743a85ef8",
			"parameterRaw": "",
			"battleDigimonDetail": {
				"userDigimonId": 57337650,
				"digimonId": 1174504,
				"awakingLevel": 0,
				"generation": 4,
				"level": 99,
				"friendshipPoint": 406290,
				"friendshipLevel": 99,
				"moodValue": 100,
				"skillLevel": 10,
				"executionLimitbreakId": 0,
				"completeTrainingIds": [],
				"lastBrokenSlbNecessaryLevel": 0,
				"wearingPluginList": [
					{
						"slotId": 0,
						"userPluginId": 30433505,
						"pluginId": 225035,
						"strengtheningValue": 5
					},
					{
						"slotId": 1,
						"userPluginId": 70678188,
						"pluginId": 224435005,
						"strengtheningValue": 5
					},
					{
						"slotId": 2,
						"userPluginId": 59095000,
						"pluginId": 445145,
						"strengtheningValue": 5
					},
					{
						"slotId": 3,
						"userPluginId": 54509151,
						"pluginId": 126425005,
						"strengtheningValue": 5
					},
					{
						"slotId": 4,
						"userPluginId": 53217166,
						"pluginId": 159435005,
						"strengtheningValue": 5
					},
					{
						"slotId": 5,
						"userPluginId": 70709410,
						"pluginId": 445135,
						"strengtheningValue": 5
					}
				],
				"hp": 9055,
				"attack": 2575,
				"defense": 1509,
				"speed": 44
			}
		},
		{
			"userDigimonId": 96884584,
			"parameterHash": "46fc6149b51418688b730cca4ba0df5d",
			"parameterRaw": "",
			"battleDigimonDetail": {
				"userDigimonId": 96884584,
				"digimonId": 1258305,
				"awakingLevel": 0,
				"generation": 5,
				"level": 110,
				"friendshipPoint": 406290,
				"friendshipLevel": 99,
				"moodValue": 100,
				"skillLevel": 10,
				"executionLimitbreakId": 0,
				"completeTrainingIds": [],
				"lastBrokenSlbNecessaryLevel": 105,
				"wearingPluginList": [
					{
						"slotId": 0,
						"userPluginId": 64775308,
						"pluginId": 274423005,
						"strengtheningValue": 5
					},
					{
						"slotId": 1,
						"userPluginId": 61634400,
						"pluginId": 333015,
						"strengtheningValue": 5
					},
					{
						"slotId": 2,
						"userPluginId": 70068510,
						"pluginId": 443105,
						"strengtheningValue": 5
					},
					{
						"slotId": 3,
						"userPluginId": 64407860,
						"pluginId": 274423005,
						"strengtheningValue": 5
					},
					{
						"slotId": 4,
						"userPluginId": 33773438,
						"pluginId": 333025,
						"strengtheningValue": 5
					},
					{
						"slotId": 5,
						"userPluginId": 71085864,
						"pluginId": 340745,
						"strengtheningValue": 5
					}
				],
				"hp": 12143,
				"attack": 7203,
				"defense": 3848,
				"speed": 43
			}
		},
	],
	7003: [
		{
			"userDigimonId": 113059847,
			"parameterHash": "5400fdbfc95cd0dfe4b1c71c595bd52d",
			"parameterRaw": "",
			"battleDigimonDetail": {
				"userDigimonId": 113059847,
				"digimonId": 1276105,
				"awakingLevel": 0,
				"generation": 5,
				"level": 99,
				"friendshipPoint": 406290,
				"friendshipLevel": 99,
				"moodValue": 100,
				"skillLevel": 10,
				"executionLimitbreakId": 0,
				"completeTrainingIds": [],
				"lastBrokenSlbNecessaryLevel": 0,
				"wearingPluginList": [
					{
						"slotId": 0,
						"userPluginId": 70230080,
						"pluginId": 281411005,
						"strengtheningValue": 5
					},
					{
						"slotId": 1,
						"userPluginId": 33541720,
						"pluginId": 331025,
						"strengtheningValue": 5
					},
					{
						"slotId": 2,
						"userPluginId": 54921924,
						"pluginId": 441105,
						"strengtheningValue": 5
					},
					{
						"slotId": 3,
						"userPluginId": 38574778,
						"pluginId": 134411005,
						"strengtheningValue": 5
					},
					{
						"slotId": 4,
						"userPluginId": 70230081,
						"pluginId": 281431005,
						"strengtheningValue": 5
					},
					{
						"slotId": 5,
						"userPluginId": 62270193,
						"pluginId": 241105,
						"strengtheningValue": 5
					}
				],
				"hp": 8589,
				"attack": 10990,
				"defense": 3584,
				"speed": 27
			}
		},
		{
			"userDigimonId": 61392802,
			"parameterHash": "d8af5cf13341dd84b0a682320f85c580",
			"parameterRaw": "",
			"battleDigimonDetail": {
				"userDigimonId": 61392802,
				"digimonId": 1189505,
				"awakingLevel": 0,
				"generation": 5,
				"level": 99,
				"friendshipPoint": 150430,
				"friendshipLevel": 66,
				"moodValue": 100,
				"skillLevel": 6,
				"executionLimitbreakId": 0,
				"completeTrainingIds": [],
				"lastBrokenSlbNecessaryLevel": 0,
				"wearingPluginList": [
					{
						"slotId": 0,
						"userPluginId": 54210704,
						"pluginId": 158425005,
						"strengtheningValue": 5
					},
					{
						"slotId": 1,
						"userPluginId": 54159515,
						"pluginId": 222435005,
						"strengtheningValue": 5
					},
					{
						"slotId": 2,
						"userPluginId": 61634446,
						"pluginId": 345095,
						"strengtheningValue": 5
					},
					{
						"slotId": 3,
						"userPluginId": 47267975,
						"pluginId": 181425005,
						"strengtheningValue": 5
					},
					{
						"slotId": 4,
						"userPluginId": 54210707,
						"pluginId": 158435005,
						"strengtheningValue": 5
					}
				],
				"hp": 8289,
				"attack": 2616,
				"defense": 1475,
				"speed": 36
			}
		},
		{
			"userDigimonId": 67919958,
			"parameterHash": "df588b09f1581c5ce86026810725f1ab",
			"parameterRaw": "",
			"battleDigimonDetail": {
				"userDigimonId": 67919958,
				"digimonId": 1205304,
				"awakingLevel": 0,
				"generation": 4,
				"level": 99,
				"friendshipPoint": 406290,
				"friendshipLevel": 99,
				"moodValue": 100,
				"skillLevel": 1,
				"executionLimitbreakId": 0,
				"completeTrainingIds": [],
				"lastBrokenSlbNecessaryLevel": 0,
				"wearingPluginList": [
					{
						"slotId": 0,
						"userPluginId": 55723170,
						"pluginId": 226423005,
						"strengtheningValue": 5
					},
					{
						"slotId": 1,
						"userPluginId": 56001699,
						"pluginId": 226433005,
						"strengtheningValue": 5
					},
					{
						"slotId": 2,
						"userPluginId": 59094988,
						"pluginId": 443555,
						"strengtheningValue": 5
					},
					{
						"slotId": 3,
						"userPluginId": 52211841,
						"pluginId": 119423005,
						"strengtheningValue": 5
					},
					{
						"slotId": 4,
						"userPluginId": 61634401,
						"pluginId": 333015,
						"strengtheningValue": 5
					},
					{
						"slotId": 5,
						"userPluginId": 62271425,
						"pluginId": 343135,
						"strengtheningValue": 5
					}
				],
				"hp": 8551,
				"attack": 2942,
				"defense": 1948,
				"speed": 39
			}
		},
		{
			"userDigimonId": 57961998,
			"parameterHash": "f6d3ffc9022a130a57a46f55b8588691",
			"parameterRaw": "",
			"battleDigimonDetail": {
				"userDigimonId": 57961998,
				"digimonId": 1182504,
				"awakingLevel": 0,
				"generation": 4,
				"level": 99,
				"friendshipPoint": 406290,
				"friendshipLevel": 99,
				"moodValue": 98,
				"skillLevel": 1,
				"executionLimitbreakId": 0,
				"completeTrainingIds": [],
				"lastBrokenSlbNecessaryLevel": 0,
				"wearingPluginList": [
					{
						"slotId": 0,
						"userPluginId": 52729751,
						"pluginId": 209425005,
						"strengtheningValue": 5
					},
					{
						"slotId": 1,
						"userPluginId": 52738729,
						"pluginId": 209435005,
						"strengtheningValue": 5
					},
					{
						"slotId": 2,
						"userPluginId": 49663168,
						"pluginId": 445125,
						"strengtheningValue": 5
					},
					{
						"slotId": 3,
						"userPluginId": 27947861,
						"pluginId": 126425005,
						"strengtheningValue": 5
					},
					{
						"slotId": 4,
						"userPluginId": 28126661,
						"pluginId": 126435005,
						"strengtheningValue": 5
					},
					{
						"slotId": 5,
						"userPluginId": 56343481,
						"pluginId": 345065,
						"strengtheningValue": 5
					}
				],
				"hp": 7011,
				"attack": 3283,
				"defense": 1573,
				"speed": 61
			}
		}
	],
}

async function handleUser<ConstrainedLanguageCodeType extends api.LanguageCodeType>(server: Server<ConstrainedLanguageCodeType>, user: User<ConstrainedLanguageCodeType>) {
	// await sleep(Math.random() * 120000)
	const ca = await fs.readFile(caCertificatePath)
	let reachedFixedPoint = false
	// user.delay = 
	while (!reachedFixedPoint) {
		log('Logging in...')
		delete user.userData
		const session = await DigiriseSession.create(server, user, {
			agent: {
				https: tunnel.httpsOverHttp({
					ca: [ca],
					proxy: {
						host: 'localhost',
						port: 8899,
					},
				}) as https.Agent /* a lie required by got's typing */,
			},
		})

		const {userData} = session
		const masters = session.masters

if (2 + 3 !== 5) {
		let partnerDigimonId = userData.personal.partnerDigimonId
		const digimonMaster = await masters.digimon
		if (true || userData.userDigimonList.length >= userData.personal.digimonMaxCount) try {
			let ecReturned = false
			async function freeDigimonFromEc(digimon: api.UserDigimon) {
				// if (userData.userDigimonList.some(d => d.isEcLocked)) {
				if (!ecReturned && digimon.isEcLocked) {
					log('Retreating from Underworld Dungeon...')
					console.dir(await session.ecReturn(), {depth: null})
					ecReturned = true
				}
			}
			log('Preparing to train and evolve Digimon...')
			const skillLevelUpItemMaster = await masters.skillLevelupItem
			const genealogiesAtSkillLevel10 = new Set(userData.userDigimonList
				.filter(digimon => digimon.skillLevel + itemCount(userData, skillLevelUpItemMaster.byGenealogy.get(digimonMaster.get(digimon.digimonId)!.genealogy)?.get(3)?.itemId) >= 10)
				.map(digimon => digimonMaster.get(digimon.digimonId)!.genealogy))
			const digimonSellMaster = await masters.digimonSell
			const desiredSuperGenealogies = [398 /*cranix*/, 401 /*snoble*/, 429 /*slovely*/, 430 /*sqinglong*/]
			const releasableDigimon = userData.userDigimonList.filter(digimon =>
				// digimon.digimonId === 1419115 ||  // this didn't even work  // don't forget to use the *current* ID, not final evo ID
				desiredSuperGenealogies.includes(digimonMaster.get(digimon.digimonId)!.genealogy) ||
				// digimonMaster.get(digimon.digimonId)!.personalityType < 6 &&
				!digimon.isLocked
				&& digimon.level <= 60
				&& digimon.skillLevel === 1
				// && !digimon.isEcLocked
				// && !userData.homeDigimonList.includes(digimon.userDigimonId)
				&& !userData.userTeamList.some(team => team.userDigimonList.includes(digimon.userDigimonId))
				&& digimon.wearingPluginList.every(wp => wp.userPluginId === api.UserData.EmptyUserPluginId)
				&& genealogiesAtSkillLevel10.has(digimonMaster.get(digimon.digimonId)!.genealogy)
				&& digimonSellMaster.get(digimonMaster.get(digimon.digimonId)!.generation)!.sellingPrice > 0
				/*&& !hasSpecificEvolutionCode(masters, digimon.digimonId)*/
			)
			// console.log(releasableDigimon)
			const constraints: {[key: string]: solver.IModelVariableConstraint} = {
				// FIXME: was feasible but was reported unfeasible
				// releasedDigimon: {min: 0},
				releasedDigimon: {min: userData.userDigimonList.length - userData.personal.digimonMaxCount + 1},
				spentBit: {max: itemCount(userData, api.UserData.ItemIdBit)},
			}
			const [trainingItemMaster, trainingItemMaterialMaster] = await Promise.all([masters.trainingItem, masters.trainingItemMaterial])
			// log(`A`)
			const variables = Object.fromEntries(Array.from(trainingItemMaster.values()).map(trainingItem => [
				'composedItem' + trainingItem.itemId,
				Object.fromEntries(trainingItemMaterialMaster.get(trainingItem.compositionId)!.map(trainingItemMaterial =>
					['spentItem' + trainingItemMaterial.materialItemId, trainingItemMaterial.num]
				).concat([
					['spentBit', trainingItem.cost],
					['spentItem' + trainingItem.itemId, -1],
				])),
			]))
			const appConstantMaster = await masters.appConstant
			const usuallyItemInfluenceFriendshipValueRate = +appConstantMaster.get('DIGIMON')!.get('USUALLY_ITEM_INFLUENCE_FRIENDSHIP_VALUE_RATE')!.value
			const usuallyItemInfluenceMoodValueRate = +appConstantMaster.get('DIGIMON')!.get('USUALLY_ITEM_INFLUENCE_MOOD_VALUE_RATE')!.value
			const partnerInfluenceFriendshipValueRate = Math.fround(1 + Math.fround(+appConstantMaster.get('DIGIMON')!.get('PARTNER_INFLUENCE_FRIENDSHIP_VALUE_RATE')!.value / 100))
			const partnerInfluenceMoodValueRate = Math.fround(1 + Math.fround(+appConstantMaster.get('DIGIMON')!.get('PARTNER_INFLUENCE_MOOD_VALUE_RATE')!.value / 100))
			// const digimonByProspects: {[prospects: string]: api.UserDigimon[]} = {}
			// let digimonByProspects = {}
			// log(`B`)
			for (const digimon of releasableDigimon) {
				const allLimitbreaks = (await masters.limitbreak).get(digimon.digimonId)!
				const limitbreaks = []
				for (let limitbreakId = digimon.executionLimitbreakId, limitbreak; limitbreak = allLimitbreaks.get(limitbreakId); limitbreakId = limitbreak.nextLimitbreakId)
					limitbreaks.push(limitbreak)
				const evolutions = []
				const evolveMaster = await masters.evolve
				for (let digimonId = digimon.digimonId, evolution; evolution = evolveMaster.get(digimonId); digimonId = evolution.nextDigimonId)
					evolutions.push(evolution)
				const gainedDigiOrb = digimonSellMaster.get(digimonMaster.get(digimon.digimonId)!.generation)!.sellingPrice
			// 	const prospects = [
			// 		digimon.level,
			// 		digimon.completeTrainingIds.length,
			// 		limitbreaks.length,
			// 		evolutions.length,
			// 		...digimon.completeTrainingIds,
			// 		...limitbreaks.map(lb => lb.trainingGroupId),
			// 		...limitbreaks.map(lb => lb.necessaryLevel),
			// 		...limitbreaks.map(lb => lb.costBit),
			// 		...evolutions.map(evo => evo.evolveUseItemId),
			// 		...evolutions.map(evo => evo.level),
			// 		...evolutions.map(evo => evo.bit),
			// 		gainedDigiOrb,
			// 		...evolutions.map(evo => digimonSellMaster.get(digimonMaster.get(evo.nextDigimonId)!.generation)!.sellingPrice),
			// 		digimonMaster.get(digimon.digimonId)!.evolutionaryType,
			// 		...evolutions.slice(0, -1).map(evo => digimonMaster.get(evo.nextDigimonId)!.evolutionaryType),
			// 	].toString()
			// 	const array = digimonByProspects[prospects]
			// 	if (array)
			// 		array.push(digimon)
			// 	else
			// 		digimonByProspects[prospects] = [digimon]
			// }
			// // console.log(digimonByProspects)
			// for (const [prospects, digimons] of Object.entries(digimonByProspects)) {
			// 	constraints[prospects] = {equal: digimons.length}
			// 	const decodedProspects = prospects.split(',').map(Number)
			// 	let [level, completeTrainingIdsLength, limitbreaksLength, evolutionsLength] = decodedProspects
			// 	let i = 4
			// 	const completeTrainingIds = decodedProspects.slice(i, i += completeTrainingIdsLength)
			// 	const limitbreakTrainingGroupIds = decodedProspects.slice(i, i += limitbreaksLength)
			// 	const limitbreakLevels = decodedProspects.slice(i, i += limitbreaksLength)
			// 	const limitbreakBits = decodedProspects.slice(i, i += limitbreaksLength)
			// 	const evolveUseItemIds = decodedProspects.slice(i, i += evolutionsLength)
			// 	const evolveLevels = decodedProspects.slice(i, i += evolutionsLength)
			// 	const evolveBits = decodedProspects.slice(i, i += evolutionsLength)
			// 	const gainedDigiOrbs = decodedProspects.slice(i, i += evolutionsLength + 1)
			// 	const evolutionaryTypes = decodedProspects.slice(i)
				const prospects = digimon.userDigimonId
				constraints[prospects] = {equal: 1}
				let level = digimon.level
				let limitbreaksLength = limitbreaks.length
				const completeTrainingIds = digimon.completeTrainingIds
				const limitbreakTrainingGroupIds = limitbreaks.map(lb => lb.trainingGroupId)
				const limitbreakLevels = limitbreaks.map(lb => lb.necessaryLevel)
				const limitbreakBits = limitbreaks.map(lb => lb.costBit)
				const evolveUseItemIds = evolutions.map(evo => evo.evolveUseItemId)
				const evolveLevels = evolutions.map(evo => evo.level)
				const evolveBits = evolutions.map(evo => evo.bit)
				const gainedDigiOrbs = [gainedDigiOrb, ...evolutions.map(evo => digimonSellMaster.get(digimonMaster.get(evo.nextDigimonId)!.generation)!.sellingPrice)]
				const evolutionaryTypes = [digimonMaster.get(digimon.digimonId)!.evolutionaryType, ...evolutions.slice(0, -1).map(evo => digimonMaster.get(evo.nextDigimonId)!.evolutionaryType)]
				variables[prospects] = {
					[prospects]: 1,
					gainedDigiOrb: gainedDigiOrbs[0],
					releasedDigimon: 1,
				}
				const variable: {[key: string]: number} = {
					[prospects]: 1,
					spentBit: 0,
					releasedDigimon: 1,
				}
				// digimon-individual begin
				// let friendshipLevel = Array.from((await masters.digimonFriendshipLevel).get(evolutionaryTypes[0]!)!.values()).sort((a, b) => b.friendshipLevel - a.friendshipLevel).find(fl => digimon.friendshipPoint >= fl.totalFriendshipPoint)!.friendshipLevel
				// let pendingCareVariables = [], previousMoodVariableNames = []
				// digimon-individual end
				let iLimitbreak = 0, maxGainedDigiOrb = gainedDigiOrbs[0]!
				for (const [j, evolveLevel] of evolveLevels.entries()) {
					const digimonLevel = (await masters.digimonLevel).get(evolutionaryTypes[j]!)!
					variable.spentBit += digimonLevel.get(evolveLevel)!.totalBit - digimonLevel.get(level)!.totalBit
					level = evolveLevel
					if (gainedDigiOrbs[gainedDigiOrbs.length - 1]! <= 50 && level > 20)
						break
					while (iLimitbreak < limitbreaksLength && limitbreakLevels[iLimitbreak]! < evolveLevel) {
						let trainingIds = (await masters.limitbreakGroup).get(limitbreakTrainingGroupIds[iLimitbreak]!)!.map(lbg => lbg.trainingId)
						if (!iLimitbreak)
							trainingIds = trainingIds.filter(id => !completeTrainingIds.includes(id))
						for (const trainingId of trainingIds)
							for (const useItem of (await masters.trainingUseItem).get(trainingId)!)
								variable['spentItem' + useItem.itemId] = (variable['spentItem' + useItem.itemId] || 0) + useItem.num
						variable.spentBit += limitbreakBits[iLimitbreak]!
						++iLimitbreak
					}
					for (const useItem of (await masters.evolveUseItem).get(evolveUseItemIds[j]!)!)
						variable['spentItem' + useItem.itemId] = (variable['spentItem' + useItem.itemId] || 0) + useItem.num
					variable.spentBit += evolveBits[j]!
					// digimon-individual begin
					/*
					if (evolve.friendshipLevel > friendshipLevel) {
						for (const careInfluence of (await masters.careInfluence).values()) {
							pendingCareVariables.push([`care${digimon.userDigimonId};${j};${careInfluence.motivation};favorite,0`, {
								`mood${digimon.userDigimonId};${j};${careInfluence.motivation}`: Math.fround(50 * Math.fround(partnerInfluenceMoodValueRate + Math.fround(careInfluence.influence_mood_value_rate / 100))) | 0,
								`friendship${digimon.userDigimonId};${j}`: Math.fround(5000 * Math.fround(partnerInfluenceFriendshipValueRate + Math.fround(careInfluence.influence_friendship_rate / 100))) | 0,
							}])
							pendingCareVariables.push([`care${digimon.userDigimonId};${j};${careInfluence.motivation};favorite,1`, {
								`mood${digimon.userDigimonId};${j};${careInfluence.motivation}`: Math.fround(35 * Math.fround(partnerInfluenceMoodValueRate + Math.fround(careInfluence.influence_mood_value_rate / 100))) | 0,
								`friendship${digimon.userDigimonId};${j}`: Math.fround(2500 * Math.fround(partnerInfluenceFriendshipValueRate + Math.fround(careInfluence.influence_friendship_rate / 100))) | 0,
							}])
							pendingCareVariables.push([`care${digimon.userDigimonId};${j};${careInfluence.motivation};favorite,2`, {
								`mood${digimon.userDigimonId};${j};${careInfluence.motivation}`: Math.fround(20 * Math.fround(partnerInfluenceMoodValueRate + Math.fround(careInfluence.influence_mood_value_rate / 100))) | 0,
								`friendship${digimon.userDigimonId};${j}`: Math.fround(500 * Math.fround(partnerInfluenceFriendshipValueRate + Math.fround(careInfluence.influence_friendship_rate / 100))) | 0,
							}])
							pendingCareVariables.push([`care${digimon.userDigimonId};${j};${careInfluence.motivation};favorite,3`, {
								`mood${digimon.userDigimonId};${j};${careInfluence.motivation}`: Math.fround(10 * Math.fround(partnerInfluenceMoodValueRate + Math.fround(careInfluence.influence_mood_value_rate / 100))) | 0,
								`friendship${digimon.userDigimonId};${j}`: Math.fround(250 * Math.fround(partnerInfluenceFriendshipValueRate + Math.fround(careInfluence.influence_friendship_rate / 100))) | 0,
							}])
							pendingCareVariables.push([`care${digimon.userDigimonId};${j};${careInfluence.motivation};usually,0`, {
								`mood${digimon.userDigimonId};${j};${careInfluence.motivation}`: Math.fround((Math.fround(50 * usuallyItemInfluenceMoodValueRate / 100) | 0) * Math.fround(partnerInfluenceMoodValueRate + Math.fround(careInfluence.influence_mood_value_rate / 100))) | 0,
								`friendship${digimon.userDigimonId};${j}`: Math.fround((Math.fround(5000 * usuallyItemInfluenceFriendshipValueRate / 100) | 0) * Math.fround(partnerInfluenceFriendshipValueRate + Math.fround(careInfluence.influence_friendship_rate / 100))) | 0,
							}])
							pendingCareVariables.push([`care${digimon.userDigimonId};${j};${careInfluence.motivation};usually,1`, {
								`mood${digimon.userDigimonId};${j};${careInfluence.motivation}`: Math.fround((Math.fround(35 * usuallyItemInfluenceMoodValueRate / 100) | 0) * Math.fround(partnerInfluenceMoodValueRate + Math.fround(careInfluence.influence_mood_value_rate / 100))) | 0,
								`friendship${digimon.userDigimonId};${j}`: Math.fround((Math.fround(2500 * usuallyItemInfluenceFriendshipValueRate / 100) | 0) * Math.fround(partnerInfluenceFriendshipValueRate + Math.fround(careInfluence.influence_friendship_rate / 100))) | 0,
							}])
							pendingCareVariables.push([`care${digimon.userDigimonId};${j};${careInfluence.motivation};usually,2`, {
								`mood${digimon.userDigimonId};${j};${careInfluence.motivation}`: Math.fround((Math.fround(20 * usuallyItemInfluenceMoodValueRate / 100) | 0) * Math.fround(partnerInfluenceMoodValueRate + Math.fround(careInfluence.influence_mood_value_rate / 100))) | 0,
								`friendship${digimon.userDigimonId};${j}`: Math.fround((Math.fround(500 * usuallyItemInfluenceFriendshipValueRate / 100) | 0) * Math.fround(partnerInfluenceFriendshipValueRate + Math.fround(careInfluence.influence_friendship_rate / 100))) | 0,
							}])
							pendingCareVariables.push([`care${digimon.userDigimonId};${j};${careInfluence.motivation};usually,3`, {
								`mood${digimon.userDigimonId};${j};${careInfluence.motivation}`: Math.fround((Math.fround(10 * usuallyItemInfluenceMoodValueRate / 100) | 0) * Math.fround(partnerInfluenceMoodValueRate + Math.fround(careInfluence.influence_mood_value_rate / 100))) | 0,
								`friendship${digimon.userDigimonId};${j}`: Math.fround((Math.fround(250 * usuallyItemInfluenceFriendshipValueRate / 100) | 0) * Math.fround(partnerInfluenceFriendshipValueRate + Math.fround(careInfluence.influence_friendship_rate / 100))) | 0,
							}])
							// pendingCareVariables.push([`care${digimon.userDigimonId};${j};${careInfluence.motivation};protein`, {
							// 	`mood${digimon.userDigimonId};${j};${careInfluence.motivation}`: Math.fround((Math.fround(125 * usuallyItemInfluenceMoodValueRate / 100) | 0) * Math.fround(partnerInfluenceMoodValueRate + Math.fround(careInfluence.influence_mood_value_rate / 100))) | 0,
							// 	`friendship${digimon.userDigimonId};${j}`: Math.fround((Math.fround(130125 * usuallyItemInfluenceFriendshipValueRate / 100) | 0) * Math.fround(partnerInfluenceFriendshipValueRate + Math.fround(careInfluence.influence_friendship_rate / 100))) | 0,
							// }])
							pendingCareVariables.push([`care${digimon.userDigimonId};${j};${careInfluence.motivation};proteinMini`, {
								`mood${digimon.userDigimonId};${j};${careInfluence.motivation}`: Math.fround((Math.fround(25 * usuallyItemInfluenceMoodValueRate / 100) | 0) * Math.fround(partnerInfluenceMoodValueRate + Math.fround(careInfluence.influence_mood_value_rate / 100))) | 0,
								`friendship${digimon.userDigimonId};${j}`: Math.fround((Math.fround(700 * usuallyItemInfluenceFriendshipValueRate / 100) | 0) * Math.fround(partnerInfluenceFriendshipValueRate + Math.fround(careInfluence.influence_friendship_rate / 100))) | 0,
							}])
							if (careInfluence.motivation < 3) {
								const thresholds = (await masters.motivationThreshold).get(digimonMaster.get(digimon.digimonId)!.generation)!
								const threshold = careInfluence.motivation == 2 ? thresholds.normalThreshold : thresholds.goodThreshold
								// FIXME update moodValue to current value
								pendingCareVariables.push([`reachMotivation${digimon.userDigimonId};${j};${careInfluence.motivation}`, {
									`mood${digimon.userDigimonId};${j};${careInfluence.motivation}`: -Number.MAX_SAFE_INTEGER,
									`accumulatedMood${digimon.userDigimonId};${j};${careInfluence.motivation+1}`: digimon.moodValue - threshold,
								}])
							}
							if (careInfluence.motivation > 1) {
								for (const name of previousMoodVariableNames) {
									if (name.split(';')[2])
								}
							}
							constraints[`mood${digimon.userDigimonId};${j};${careInfluence.motivation}`] = {max: 0}
							constraints[``] = {min: 0}
						}
						friendshipLevel = evolve.friendshipLevel
					}
					*/
					// digimon-individual end
					if (gainedDigiOrbs[j + 1]! > maxGainedDigiOrb) {
						// maxGainedDigiOrb = gainedDigiOrbs[j + 1]
						variables[prospects + ';' + j] = {
							...variable,
							gainedDigiOrb: maxGainedDigiOrb = gainedDigiOrbs[j + 1]!,
						}
						// digimon-individual begin
						/*
						for (const [name, variable] of pendingCareVariables)
							variables[name] = variable
						pendingCareVariables = []
						*/
						// digimon-individual end
					}
				}
				variables['keep' + prospects] = {
					[prospects]: 1,
					gainedDigiOrb: maxGainedDigiOrb,
				}
			}
			// log(`C`)
			for (const variable of Object.values(variables)) {
				const {gainedDigiOrb} = variable
				delete variable.gainedDigiOrb
				for (const constraintName of Object.keys(variable)) {
					if (!(constraintName in constraints)) {
						const m = constraintName.match(/^spentItem([1-9][0-9]*)$/)!
						constraints[constraintName] = {max: itemCount(userData, +m[1]!)}
					}
				}
				if (gainedDigiOrb !== undefined)
					// TODO minimize resources spent
					variable.score = gainedDigiOrb * (releasableDigimon.length + 1) + (variable.releasedDigimon || 0)
			}
			let solution
			const useSolver = 1
			if (useSolver) {
				log(`Solving with ${Object.keys(constraints).length} constraints, ${Object.keys(variables).length} variables...`)
				// console.log(constraints)
				// console.log(variables)
				solution = solver.Solve<string, string>({
					optimize: 'score',
					opType: 'max',
					constraints,
					variables,
					ints: Object.fromEntries(Object.keys(variables).map(key => [key, true])),
					options: {
						timeout: 10000,
					},
				})
				// log(`E`)
				// console.log(solution)
				// return
				if (!solution.feasible) {
					const error: any = new Error('The releasing problem is not feasible! Check your Digimon that use specific evolution code, your locked Digimon and your current teams, or expand Digimon storage.')
					error.constraints = constraints
					error.variables = variables
					error.solution = solution
					throw error
				}
			}
			reachedFixedPoint = true
			// log(`F`)
			// log(`G`)
			try {
				// for (const [prospects, digimons] of Object.entries(digimonByProspects)) {
				// 	const decodedProspects = prospects.split(',').map(Number)
				// 	let [level, completeTrainingIdsLength, limitbreaksLength, evolutionsLength] = decodedProspects
				// 	let i = 4
				// 	const completeTrainingIds = decodedProspects.slice(i, i += completeTrainingIdsLength)
				// 	const limitbreakTrainingGroupIds = decodedProspects.slice(i, i += limitbreaksLength)
				// 	const limitbreakLevels = decodedProspects.slice(i, i += limitbreaksLength)
				// 	const limitbreakBits = decodedProspects.slice(i, i += limitbreaksLength)
				// 	const evolveUseItemIds = decodedProspects.slice(i, i += evolutionsLength)
				// 	const evolveLevels = decodedProspects.slice(i, i += evolutionsLength)
				// 	const evolveBits = decodedProspects.slice(i, i += evolutionsLength)
				// 	const gainedDigiOrbs = decodedProspects.slice(i, i += evolutionsLength + 1)
				// 	const evolutionaryTypes = decodedProspects.slice(i)
				for (const digimon of releasableDigimon) {
					// log(`H ${digimonMaster.get(digimon.digimonId)!.name} (${(await masters.personalityType).get(digimonMaster.get(digimon.digimonId)!.personalityType)!.name}) #${digimon.userDigimonId}`)
					const digimons = [digimon]
					const allLimitbreaks = (await masters.limitbreak).get(digimon.digimonId)!
					const limitbreaks = []
					for (let limitbreakId = digimon.executionLimitbreakId, limitbreak; limitbreak = allLimitbreaks.get(limitbreakId); limitbreakId = limitbreak.nextLimitbreakId)
						limitbreaks.push(limitbreak)
					const evolutions = []
					const evolveMaster = await masters.evolve
					for (let digimonId = digimon.digimonId, evolution; evolution = evolveMaster.get(digimonId); digimonId = evolution.nextDigimonId)
						evolutions.push(evolution)
					const gainedDigiOrb = digimonSellMaster.get(digimonMaster.get(digimon.digimonId)!.generation)!.sellingPrice
					const prospects = digimon.userDigimonId
					let limitbreaksLength = limitbreaks.length
					const completeTrainingIds = digimon.completeTrainingIds
					const limitbreakTrainingGroupIds = limitbreaks.map(lb => lb.trainingGroupId)
					const limitbreakLevels = limitbreaks.map(lb => lb.necessaryLevel)
					const limitbreakBits = limitbreaks.map(lb => lb.costBit)
					const evolveUseItemIds = evolutions.map(evo => evo.evolveUseItemId)
					const evolveLevels = evolutions.map(evo => evo.level)
					const evolveBits = evolutions.map(evo => evo.bit)
					const gainedDigiOrbs = [gainedDigiOrb, ...evolutions.map(evo => digimonSellMaster.get(digimonMaster.get(evo.nextDigimonId)!.generation)!.sellingPrice)]
					const evolutionaryTypes = [digimonMaster.get(digimon.digimonId)!.evolutionaryType, ...evolutions.slice(0, -1).map(evo => digimonMaster.get(evo.nextDigimonId)!.evolutionaryType)]

					// Release least friendly Digimon as they are;
					// evolve most friendly Digimon before releasing
					digimons.sort((a, b) => b.friendshipPoint - a.friendshipPoint)  // desc
					const releasableAsIs = solution ? digimons.splice(digimons.length - (solution[prospects] || 0)) : []
					if (solution)
						digimons.splice(digimons.length - (solution['keep' + prospects] || 0))

					let targetEvolve = -1, n = 0
					for (const digimon of digimons) {
						if (solution) {
							while (!n--)
								n = solution[prospects + ';' + ++targetEvolve] || 0
						} else {
							while ((prospects + ';' + (targetEvolve+1)) in variables)
								++targetEvolve
						}
					evolveLoop:
						for (let iEvolve = 0; iEvolve <= targetEvolve; ++iEvolve) {
							const evolve = (await masters.evolve).get(digimon.digimonId)!
							const evolutionaryType = digimonMaster.get(digimon.digimonId)!.evolutionaryType
							const digimonLevel = (await masters.digimonLevel).get(evolutionaryType)!

							const allLimitbreaks = (await masters.limitbreak).get(digimon.digimonId)!
							for (let limitbreakId = digimon.executionLimitbreakId, limitbreak; limitbreak = allLimitbreaks.get(limitbreakId); limitbreakId = limitbreak.nextLimitbreakId) {
								if (limitbreak.necessaryLevel >= evolve.level)
									break
								// log(`L`)
								const allTrainingIds = (await masters.limitbreakGroup).get(limitbreak.trainingGroupId)!.map(lbg => lbg.trainingId)
								const trainingIdList = true //limitbreakId === digimon.executionLimitbreakId
									? allTrainingIds.filter(id => !digimon.completeTrainingIds.includes(id))
									: allTrainingIds
								// log(`M`)
								const composeItemList = []
								let composeBit = 0
								for (const trainingId of trainingIdList) {
									const useItemQueue = (await masters.trainingUseItem).get(trainingId)!.map(i => [i.itemId, 1 as number] as const)
									for (let head = 0; head < useItemQueue.length; ++head) {
										const [itemId, count] = useItemQueue[head]!
										// log(`N ${head}/${useItemQueue.length} = ${itemId} x${count}`)
										const haveCount = itemCount(userData, itemId)  //userData.userItemList.find(i => i.itemId === itemId)?.count || 0
										if (haveCount < count) {
											const missingCount = count - haveCount
											composeItemList.push({itemId, num: missingCount})
											const trainingItem = trainingItemMaster.get(itemId)
											if (!trainingItem) {
												error(`Not enough training items #${itemId} for ${digimonMaster.get(digimon.digimonId)!.name} (${(await masters.personalityType).get(digimonMaster.get(digimon.digimonId)!.personalityType)!.name}) #${digimon.userDigimonId}! Bug in lp-solver?`)
												break evolveLoop
											}
											composeBit += missingCount * trainingItem.cost
											for (const material of trainingItemMaterialMaster.get(trainingItem.compositionId)!)
												useItemQueue.push([material.materialItemId, missingCount * material.num])
											const userItem = userData.userItemList.find(i => i.itemId === itemId)
											if (userItem)
												userItem.count = 0
											else
												userData.userItemList.push({itemId, count: 0})
										} else
											userData.userItemList.find(i => i.itemId === itemId)!.count -= count
									}
								}
								let reinforcementBit = 0
								if (digimon.level < limitbreak.necessaryLevel)
									reinforcementBit = digimonLevel.get(limitbreak.necessaryLevel)!.totalBit - digimon.bit
								const totalBit = reinforcementBit + composeBit + limitbreak.costBit
								if (totalBit > itemCount(userData, api.UserData.ItemIdBit)) {
									error(`Not enough bits to train and limit-break ${digimonMaster.get(digimon.digimonId)!.name} (${(await masters.personalityType).get(digimonMaster.get(digimon.digimonId)!.personalityType)!.name}) #${digimon.userDigimonId}! Bug in lp-solver?`)
									break evolveLoop
								}
								if (digimon.level < limitbreak.necessaryLevel) {
									log(`Training ${digimonMaster.get(digimon.digimonId)!.name} (${(await masters.personalityType).get(digimonMaster.get(digimon.digimonId)!.personalityType)!.name}) #${digimon.userDigimonId} to level ${limitbreak.necessaryLevel}...`)
									if (reinforcementBit > itemCount(userData, api.UserData.ItemIdBit)) {
										error(`Not enough bits! Bug in lp-solver?`)
										break evolveLoop
									}
									reachedFixedPoint = false
									await freeDigimonFromEc(digimon)
									await session.digimonReinforcement(digimon.userDigimonId, reinforcementBit)
									userData.userItemList.find(i => i.itemId === api.UserData.ItemIdBit)!.count -= reinforcementBit
									// log(`K`)
									digimon.level = limitbreak.necessaryLevel
									digimon.bit = digimonLevel.get(digimon.level)!.totalBit
								}
								// log(`O`)
								if (composeItemList.length) {
									log('Composing...', composeItemList.reverse())
									if (composeBit > itemCount(userData, api.UserData.ItemIdBit)) {
										error(`Not enough bits! Bug in lp-solver?`)
										break evolveLoop
									}
									reachedFixedPoint = false
									await session.itemComposeTrainingItem(composeItemList.reverse())
									userData.userItemList.find(i => i.itemId === api.UserData.ItemIdBit)!.count -= composeBit
								}
								log(`Special-training and limit-breaking ${digimonMaster.get(digimon.digimonId)!.name} (${(await masters.personalityType).get(digimonMaster.get(digimon.digimonId)!.personalityType)!.name}) #${digimon.userDigimonId}...`)
								if (limitbreak.costBit > itemCount(userData, api.UserData.ItemIdBit)) {
									error(`Not enough bits! Bug in lp-solver?`)
									break evolveLoop
								}
								reachedFixedPoint = false
								await freeDigimonFromEc(digimon)
								await session.digimonTraining(digimon.userDigimonId, [
									{
										limitbreakId,
										trainingIdList,
									},
									{
										limitbreakId: limitbreak.nextLimitbreakId,
										trainingIdList: [],
									},
								])
								userData.userItemList.find(i => i.itemId === api.UserData.ItemIdBit)!.count -= limitbreak.costBit
								digimon.executionLimitbreakId = limitbreak.nextLimitbreakId
								digimon.completeTrainingIds = []
							}
							if (digimon.level < evolve.level) {
								log(`Training ${digimonMaster.get(digimon.digimonId)!.name} (${(await masters.personalityType).get(digimonMaster.get(digimon.digimonId)!.personalityType)!.name}) #${digimon.userDigimonId} to level ${evolve.level}...`)
								const bit = digimonLevel.get(evolve.level)!.totalBit - digimon.bit
								if (bit > itemCount(userData, api.UserData.ItemIdBit)) {
									error(`Not enough bits! Bug in lp-solver?`)
									break evolveLoop
								}
								reachedFixedPoint = false
								await freeDigimonFromEc(digimon)
								await session.digimonReinforcement(digimon.userDigimonId, bit)
								userData.userItemList.find(i => i.itemId === api.UserData.ItemIdBit)!.count -= bit
								digimon.level = evolve.level
								digimon.bit = digimonLevel.get(digimon.level)!.totalBit
							}

							const missingFriendshipPoint = (await masters.digimonFriendshipLevel).get(evolutionaryType)!.get(evolve.friendshipLevel)!.totalFriendshipPoint - digimon.friendshipPoint
							if (missingFriendshipPoint > 0) {
								reachedFixedPoint = false
								if (partnerDigimonId !== digimon.userDigimonId) {
									log(`Changing partner to ${digimonMaster.get(digimon.digimonId)!.name} (${(await masters.personalityType).get(digimonMaster.get(digimon.digimonId)!.personalityType)!.name}) #${digimon.userDigimonId}...`)
									await freeDigimonFromEc(userData.userDigimonList.find(d => d.userDigimonId === partnerDigimonId)!)
									await freeDigimonFromEc(digimon)
									await session.digimonSetPartner(digimon.userDigimonId)
									partnerDigimonId = digimon.userDigimonId
								}
								// TODO feed better
								await feedDigimonForFriendship(session, masters, digimon, gainedDigiOrbs[gainedDigiOrbs.length - 1]! <= 50, missingFriendshipPoint)
							}

							if (await hasSpecificEvolutionCode(masters, digimon.digimonId) && evolve.level >= 60 && !desiredSuperGenealogies.includes(digimonMaster.get(digimon.digimonId)!.genealogy))
								break

							log(`Evolving ${digimonMaster.get(digimon.digimonId)!.name} (${(await masters.personalityType).get(digimonMaster.get(digimon.digimonId)!.personalityType)!.name}) #${digimon.userDigimonId}...`)
							if (evolve.bit > itemCount(userData, api.UserData.ItemIdBit)) {
								error(`Not enough bits! Bug in lp-solver?`)
								break evolveLoop
							}
							reachedFixedPoint = false
							await freeDigimonFromEc(digimon)
							await session.digimonEvolve(digimon.userDigimonId)
							userData.userItemList.find(i => i.itemId === api.UserData.ItemIdBit)!.count -= evolve.bit
							digimon.digimonId = evolve.nextDigimonId
							digimon.maxFriendshipLevel += evolve.addMaxFriendshipLevel
						}
					}
				}
				// log(`I`)
			} catch (e) {
				if (e instanceof DigiriseError) {
					error(e)
					reachedFixedPoint = false
					continue
				}
				else
					throw e
			}
			// log(`J`)
		} finally {
			if (partnerDigimonId !== userData.personal.partnerDigimonId) {
				const partnerDigimonName = digimonMaster.get(userData.userDigimonList.find(d => d.userDigimonId === userData.personal.partnerDigimonId)!.digimonId)!.name
				log(`Changing partner back to ${partnerDigimonName}...`)
				await session.digimonSetPartner(userData.personal.partnerDigimonId)
				partnerDigimonId = userData.personal.partnerDigimonId
			}
		}

		const dfqId = 6036
		let featurePts = itemCount(userData, 20000 + dfqId)
		// let featurePts = 0
		while (featurePts >= 100) {
			const rollCount = Math.min(10, featurePts / 100 | 0)
			log(`Pulling the DFQ gasha ${rollCount} times...`)
			await session.scenarioEventGashaRoll(dfqId, rollCount)
			featurePts -= 100 * rollCount
		}
}

		// console.dir(await session.gashaTop(), {depth: null})

		/*
		const gashaRate = await session.gashaGetRate(246, [11731])
		// console.dir(gashaRate, {depth: null})
		const lotteryList = gashaRate.rateList[0]!.lotteryList

		// const rateList = lotteryList[0]!.rateList
		// const totalRates = new Map<number, number>()
		// const digimonMaster = await masters.digimon
		// const evolveMaster = await masters.evolve
		// for (const {prizeId, rate} of rateList) {
		// 	let digimonId = prizeId, evolution
		// 	while (evolution = evolveMaster.get(digimonId))
		// 		digimonId = evolution.nextDigimonId
		// 	if (digimonMaster.get(digimonId)!.generation > 4) {
		// 		totalRates.set(digimonId, (totalRates.get(digimonId) ?? 0) + +rate)
		// 	}
		// }
		// for (const [digimonId, rate] of totalRates.entries()) {
		// 	let [integral, fractional] = ('' + rate).split('.')
		// 	if (!fractional)
		// 		fractional = '0'

		// const useItemRate: { [itemId: number]: Map<number, number> } = {}
		const digimonUseItem: { [digimonId: number]: Map<number, number> } = {}
		let adjustedLotteryList: (typeof lotteryList[0] & {rateList: (typeof lotteryList[0]['rateList'][0] & {cumulativeRate: number})[]})[]
		adjustedLotteryList = lotteryList as typeof adjustedLotteryList
		for (const lottery of adjustedLotteryList) {
			// lottery.num
			let accumulatedRate = 0
			for (const prizeRate of lottery.rateList) {
				let {prizeType, prizeId: digimonId, rate} = prizeRate
				if (prizeType !== 1)
					throw new Error(`Unexpected prizeType in gasha lottery rateList: ${prizeType}`)

				let finalDigimonId = digimonId
				for (let evolve; evolve = (await masters.evolve).get(finalDigimonId); finalDigimonId = evolve.nextDigimonId);
				const evolveBeyond20 = (await masters.digimonSell).get((await masters.digimon).get(finalDigimonId)!.generation)!.sellingPrice > 50

				const needItem = digimonUseItem[digimonId] = new Map

				let level = (await masters.evolve).byNext.get(digimonId)?.level ?? 1
				for (let evolve; (evolve = (await masters.evolve).get(digimonId)) && (evolveBeyond20 || evolve.level <= 20); digimonId = evolve.nextDigimonId, level = evolve.level)
					for (const [limitbreakId, limitbreak] of (await masters.limitbreak).get(digimonId)!)
						if (limitbreak.necessaryLevel > level && limitbreak.necessaryLevel < evolve.level)
							for (const {trainingId} of (await masters.limitbreakGroup).get(limitbreak.trainingGroupId)!)
								for (const {itemId, num} of (await masters.trainingUseItem).get(trainingId)!)
									needItem.set(itemId, (needItem.get(itemId) ?? 0) + num)

				// for (const [itemId, num] of needItem.entries()) {
				// 	const uir = useItemRate[itemId] ??= new Map
				// 	uir.set(num, (uir.get(num) ?? 0) + +rate)
				// }

				accumulatedRate += +rate / 100
				prizeRate.cumulativeRate = accumulatedRate
			}
		}
		// const composeItemList = []
		// for (const trainingId of trainingIdList) {
		// 	const useItemQueue = (await masters.trainingUseItem).get(trainingId)!.map(i => [i.itemId, 1 as number] as const)
		// 	for (let head = 0; head < useItemQueue.length; ++head) {
		// 		const [itemId, count] = useItemQueue[head]!
		// 		const haveCount = itemCount(userData, itemId)  //userData.userItemList.find(i => i.itemId === itemId)?.count || 0
		// 		if (haveCount < count) {
		// 			const missingCount = count - haveCount
		// 			composeItemList.push({itemId, num: missingCount})
		// 			for (const material of trainingItemMaterialMaster.get(trainingItemMaster.get(itemId)!.compositionId)!)
		// 				useItemQueue.push([material.materialItemId, missingCount * material.num])
		// 			const userItem = userData.userItemList.find(i => i.itemId === itemId)
		// 			if (userItem)
		// 				userItem.count = 0
		// 			else
		// 				userData.userItemList.push({itemId, count: 0})
		// 		} else
		// 			userData.userItemList.find(i => i.itemId === itemId)!.count -= count
		// 	}
		// }
		const digimonGashaSlotOffset = +(await masters.appConstant).get('GASHA')!.get('DIGIMON_GASHA_SLOT_OFFSET')!.value
		const maxDigimon = userData.personal.digimonMaxCount + digimonGashaSlotOffset
		const pullableDigimon = maxDigimon - userData.userDigimonList.length
		console.log(`pullableDigimon: ${pullableDigimon}`)
		const minNeededItemNum = new Map<number, number>()
		const itemMaster = await masters.item
		if (false) {
			setInterval(() => {
				console.log([...minNeededItemNum].map(([itemId, num]) => num + ' ' + itemMaster.get(itemId)!.itemName).join(', '))
			}, 1000)
			setImmediate(function iterate() {
				const neededItemNum = new Map<number, number>()
				for (let n = pullableDigimon; n >= 0; ) {
					for (const {num, rateList} of adjustedLotteryList) {
						for (let i = num; i--; --n) {
							let digimonId
							for (;;) {
								const random = Math.random()
								let lo = 0, hi = rateList.length
								while (lo < hi) {
									const mi = lo + hi >>> 1
									if (rateList[mi]!.cumulativeRate < random)
										lo = mi + 1
									else
										hi = mi
								}
								if (hi < rateList.length) {
									digimonId = rateList[hi]!.prizeId
									break
								}
							}
							for (const [itemId, num] of digimonUseItem[digimonId]!)
								neededItemNum.set(itemId, (neededItemNum.get(itemId) ?? 0) + num)
						}
					}
				}
				for (const [itemId, num] of neededItemNum) {
					const known = minNeededItemNum.get(itemId)
					if (!known || known < num)
						minNeededItemNum.set(itemId, num)
				}
				setImmediate(iterate)
			})
		}
		*/

		// 	const digimon = digimonMaster.get(digimonId)!

		// 	const enName = t9n.enNameFromJa(digimon.name)
		// 	let name
		// 	if (!enName)
		// 		name = digimon.name
		// 	else if (enName['en-JP'] === enName['en-US'])
		// 		name = enName['en-JP']
		// 	else
		// 		name = `${enName['en-JP']}/${enName['en-US']}`

		// 	const personality = [, 'red', 'blue', 'purple', 'yellow', 'green'][digimon.personalityType]
		// 	console.log(`﹍${integral}.|${fractional}%_|${personality}_|${name}`)
		// }

		log(`Currently have ${itemCount(userData, 20000)} stamina drinks.`)

		const teamDigimonParameterList = digimonParameterList[7002]!
		const allTeamsDigimonParameterList = [...digimonParameterList[7001]!, ...digimonParameterList[7002]!, ...digimonParameterList[7003]!]

		const partnerDigimonParameter: api.BattleLogParameterInfo = {
			"userDigimonId": 96884584,
			"parameterHash": "46fc6149b51418688b730cca4ba0df5d",
			"parameterRaw": "",
			"battleDigimonDetail": {
				"userDigimonId": 96884584,
				"digimonId": 1258305,
				"awakingLevel": 0,
				"generation": 5,
				"level": 110,
				"friendshipPoint": 406290,
				"friendshipLevel": 99,
				"moodValue": 100,
				"skillLevel": 10,
				"executionLimitbreakId": 0,
				"completeTrainingIds": [],
				"lastBrokenSlbNecessaryLevel": 105,
				"wearingPluginList": [
					{
						"slotId": 0,
						"userPluginId": 64775308,
						"pluginId": 274423005,
						"strengtheningValue": 5
					},
					{
						"slotId": 1,
						"userPluginId": 61634400,
						"pluginId": 333015,
						"strengtheningValue": 5
					},
					{
						"slotId": 2,
						"userPluginId": 70068510,
						"pluginId": 443105,
						"strengtheningValue": 5
					},
					{
						"slotId": 3,
						"userPluginId": 64407860,
						"pluginId": 274423005,
						"strengtheningValue": 5
					},
					{
						"slotId": 4,
						"userPluginId": 33773438,
						"pluginId": 333025,
						"strengtheningValue": 5
					},
					{
						"slotId": 5,
						"userPluginId": 71085864,
						"pluginId": 340745,
						"strengtheningValue": 5
					}
				],
				"hp": 12143,
				"attack": 7203,
				"defense": 3848,
				"speed": 43
			}
		}

		const homeStatusEvery = await session.homeStatusEvery()
		let historyId = undefined
		if (homeStatusEvery.battleResume) {
			// if (homeStatusEvery.battleResume.battleStyle !== api.BattleStyle.Ec) {
			// }
			historyId = homeStatusEvery.battleResume.historyId
		}
		for (;;) {
			const teamId = 7002
			let floorInfo, userProgressInfo, ecStart
			if (historyId) {
				ecStart = await session.ecResume(historyId)
				const resumeInfo: any = JSON.parse(ecStart.resumeInfo)
				floorInfo = resumeInfo.ecFloorInfo
				userProgressInfo = resumeInfo.ecProgressInfo
			} else {
				const ecTop = await session.ecTop()

				const selectableNodeInfos = ecTop.userProgressInfo.nodeInfoList.filter(ni => ni.state === api.EcNodeState.Selectable)
				// const lineInfos = ecTop.mapInfo.lineInfoList.filter(li => li.fromNodeId === ecTop.userProgressInfo.currentNodeId)
				// if (!lineInfos.length) {
				if (!selectableNodeInfos.length) {
					const ecReturn = await session.ecReturn(/*ecTop.ecHistoryId*/)
					let userPluginIds = []
					for (const ecPrizeInfo of ecReturn.prizeInfoList) {
						for (const prizeInfo of ecPrizeInfo.prizeInfoList) {
							if (prizeInfo.prizeType === api.PrizeType.Plugin) {
								userPluginIds.push(prizeInfo.userPlugin!.userPluginId)
							}
						}
					}
					while (userPluginIds.length)
						await session.pluginSell(userPluginIds.splice(0, 10))
					continue
				}

				// const nodeId = lineInfos[Math.floor(Math.random() * lineInfos.length)]!.toNodeId
				const nodeId = selectableNodeInfos[Math.floor(Math.random() * selectableNodeInfos.length)]!.nodeId

				floorInfo = ecTop.mapInfo.floorInfoList.find(fi => fi.nodeId === nodeId)!

				const staminaMax = session.userData.personal.staminaMax
				const stamina = Math.max(
					session.userData.personal.stamina,
					Math.min(
						staminaMax,
						session.userData.personal.stamina + (Date.now() - (parseDate(session.userData.personal.staminaChangeTime).getTime() + 1000)) / 180000
					),
				)
				if (stamina < floorInfo.staminaCost)
					session.userData.personal.stamina = (await session.questStaminaRecover(2)).afterStamina

				userProgressInfo = ecTop.userProgressInfo
				if (nodeId === 1) {
					for (const digimonStatus of userProgressInfo.digimonStatusList) {
						const digimonId = session.userData.userDigimonList.find(ud => ud.userDigimonId === digimonStatus.userDigimonId)!.digimonId
						const growthType = (await masters.digimon).get(digimonId)!.growthType
						const growth = (await masters.digimonParameter).get(growthType)!
						digimonStatus.hp = calcStat(growth, 99, 'hp')
					}
				}
				ecStart = await session.ecStart({
					nodeId,
					teamId,
					digimonParameterList: teamDigimonParameterList,
					partnerDigimonParameter,
					resumeInfo: JSON.stringify(
						{
							"isSkipScenario": false,
							"rawTeamId": teamId,
							"partyMotivations": [],
							"_helperTamer": {
								"displayOrder": 0,
								"userId": 0,
								"tamerName": "",
								"tamerLevel": 0,
								"loginDate": "",
								"addDate": "",
								"nextGreetingDate": "",
								"description": "",
								"friendState": 0,
								"partnerDigimon": {
									"userDigimonId": 0,
									"digimonId": 0,
									"level": 1,
									"maxLevel": 1,
									"friendshipLevel": 0,
									"maxFriendshipLevel": 20,
									"moodValue": 0,
									"skillLevel": 1,
									"executionLimitbreakId": 1,
									"completeTrainingIds": [],
									"lastBrokenSlbNecessaryLevel": 0,
									"wearingPluginList": [],
									"lastCareTime": "",
									"awakingLevel": 0
								},
								"friendCode": "",
								"isNewFriend": false,
								"playableRivalBattle": false,
								"leagueVictoryCount": 0
							},
							"_hasHelperTamer": false,
							"style": api.BattleStyle.Ec,
							"battleId": 0,
							"historyId": 0,
							"battleContentId": nodeId,
							"battleContentUniqueId": 0,
							"selectWeeklySectionLevel": -1,
							"weeklyQuestPlayedCount": 0,
							"yourParameterRevise": 1.0,
							"opponentParameterRevise": 1.0,
							"_hasBattleParkUserRanking": false,
							"canRaidHelpRequest": false,
							"isEnableUserReview": false,
							"_info": {
								"historyId": -1,
								"yourParameterRevise": 1.0,
								"opponentParameterRevise": 1.0,
								"placementAsset": "",
								"backgroundAsset": "",
								"skyboxAsset": "",
								"yourDigimons": [],
								"partnerDigimon": {
									"userDigimonId": -1,
									"battleDigimonId": 0,
									"personality": 1,
									"name": "",
									"level": 0,
									"maxLevel": 1,
									"hp": 0,
									"attack": 0,
									"attackType": 1,
									"defense": 0,
									"speed": 0,
									"friendshipLevel": 0,
									"friendshipPoint": 0,
									"friendshipLevelLimit": 0,
									"isPartnerDigimon": false,
									"isDFQGuestDigimon": false,
									"isXLBHelperDigimon": false,
									"modelAsset": "",
									"iconAsset": "",
									"digimonId": 0,
									"motivation": 3,
									"awakingLevel": 0,
									"criticalRateRevise": 0,
									"sharpshootRateRevise": 0,
									"blockRateRevise": 0,
									"continuousAttackRateRevise": 0,
									"counterAttackRateRevise": 0,
									"friendshipSkillGaugeGainRateRevise": 0,
									"motivationCriticalRate": 0,
									"motivationSharpshootRate": 0,
									"motivationBlockRate": 0,
									"motivationContinuousAttackRate": 0,
									"motivationCounterAttackRate": 0,
									"motivationFriendshipSkillGaugeGainRate": 0,
									"skills": [],
									"resistances": [],
									"maxSkillLevel": 0,
									"pluginIdList": [],
									"slayerParameterInfo": {
										"hpRate": 1.0,
										"attackRate": 1.0,
										"defenseRate": 1.0,
										"speedRate": 1.0,
										"isSlayer": false,
										"state": 0,
										"isPersonal": false,
										"slayerParameterType": 0,
										"slayerIdList": []
									},
									"lastNecessaryLevel": 0
								},
								"helperDigimon": {
									"userDigimonId": -1,
									"battleDigimonId": 0,
									"personality": 1,
									"name": "",
									"level": 0,
									"maxLevel": 1,
									"hp": 0,
									"attack": 0,
									"attackType": 1,
									"defense": 0,
									"speed": 0,
									"friendshipLevel": 0,
									"friendshipPoint": 0,
									"friendshipLevelLimit": 0,
									"isPartnerDigimon": false,
									"isDFQGuestDigimon": false,
									"isXLBHelperDigimon": false,
									"modelAsset": "",
									"iconAsset": "",
									"digimonId": 0,
									"motivation": 3,
									"awakingLevel": 0,
									"criticalRateRevise": 0,
									"sharpshootRateRevise": 0,
									"blockRateRevise": 0,
									"continuousAttackRateRevise": 0,
									"counterAttackRateRevise": 0,
									"friendshipSkillGaugeGainRateRevise": 0,
									"motivationCriticalRate": 0,
									"motivationSharpshootRate": 0,
									"motivationBlockRate": 0,
									"motivationContinuousAttackRate": 0,
									"motivationCounterAttackRate": 0,
									"motivationFriendshipSkillGaugeGainRate": 0,
									"skills": [],
									"resistances": [],
									"maxSkillLevel": 0,
									"pluginIdList": [],
									"slayerParameterInfo": {
										"hpRate": 1.0,
										"attackRate": 1.0,
										"defenseRate": 1.0,
										"speedRate": 1.0,
										"isSlayer": false,
										"state": 0,
										"isPersonal": false,
										"slayerParameterType": 0,
										"slayerIdList": []
									},
									"lastNecessaryLevel": 0
								},
								"battleTimeLimit": 0,
								"waves": [],
								"floorSkill": {
									"skillId": 0,
									"level": 0
								},
								"raidBattleData": {
									"uniqueRaidId": 0,
									"raidBattleId": 0,
									"raidBossBattleDigimonId": 0,
									"raidBossIconAsset": "",
									"remainBossHp": 0,
									"bossLevel": 0
								},
								"battleParkData": {
									"you": {
										"userId": 0,
										"tamerName": "",
										"tamerLevel": 0,
										"rankId": 0,
										"ranking": {
											"displayType": 0,
											"ranking": 0,
											"highRanking": 0,
											"lowRanking": 0
										},
										"bpPoint": 0,
										"rankName": "",
										"partnerUserDigimon": {
											"userDigimonId": 0,
											"digimonId": 0,
											"isLocked": false,
											"isEcLocked": false,
											"bit": 0,
											"level": 1,
											"maxLevel": 1,
											"friendshipPoint": 0,
											"maxFriendshipLevel": 20,
											"moodValue": 0.0,
											"skillLevel": 1,
											"executionLimitbreakId": 1,
											"completeTrainingIds": [],
											"wearingPluginList": [],
											"addFriendshipPointByPeriod": 0,
											"lastCareTime": "",
											"lastBrokenSlbNecessaryLevel": 0,
											"awakingLevel": 0
										},
										"winStreakCount": 0,
										"friendState": 0,
										"battleParkTeamList": [],
										"greetings": "",
										"lastLogin": "",
										"isClanMember": false,
										"leagueType": 0,
										"leagueVictoryCount": 0
									},
									"opponent": {
										"userId": 0,
										"tamerName": "",
										"tamerLevel": 0,
										"rankId": 0,
										"ranking": {
											"displayType": 0,
											"ranking": 0,
											"highRanking": 0,
											"lowRanking": 0
										},
										"bpPoint": 0,
										"rankName": "",
										"partnerUserDigimon": {
											"userDigimonId": 0,
											"digimonId": 0,
											"isLocked": false,
											"isEcLocked": false,
											"bit": 0,
											"level": 1,
											"maxLevel": 1,
											"friendshipPoint": 0,
											"maxFriendshipLevel": 20,
											"moodValue": 0.0,
											"skillLevel": 1,
											"executionLimitbreakId": 1,
											"completeTrainingIds": [],
											"wearingPluginList": [],
											"addFriendshipPointByPeriod": 0,
											"lastCareTime": "",
											"lastBrokenSlbNecessaryLevel": 0,
											"awakingLevel": 0
										},
										"winStreakCount": 0,
										"friendState": 0,
										"battleParkTeamList": [],
										"greetings": "",
										"lastLogin": "",
										"isClanMember": false,
										"leagueType": 0,
										"leagueVictoryCount": 0
									},
									"boostSlayerIds": []
								},
								"underworldData": {
									"floorNumber": 0
								},
								"xlbData": {
									"bossIconAsset": ""
								},
								"rivalBattleData": {
									"you": {
										"userId": 0,
										"tamerName": "",
										"tamerLevel": 0,
										"rankId": 0,
										"ranking": {
											"displayType": 0,
											"ranking": 0,
											"highRanking": 0,
											"lowRanking": 0
										},
										"bpPoint": 0,
										"rankName": "",
										"partnerUserDigimon": {
											"userDigimonId": 0,
											"digimonId": 0,
											"isLocked": false,
											"isEcLocked": false,
											"bit": 0,
											"level": 1,
											"maxLevel": 1,
											"friendshipPoint": 0,
											"maxFriendshipLevel": 20,
											"moodValue": 0.0,
											"skillLevel": 1,
											"executionLimitbreakId": 1,
											"completeTrainingIds": [],
											"wearingPluginList": [],
											"addFriendshipPointByPeriod": 0,
											"lastCareTime": "",
											"lastBrokenSlbNecessaryLevel": 0,
											"awakingLevel": 0
										},
										"winStreakCount": 0,
										"friendState": 0,
										"battleParkTeamList": [],
										"greetings": "",
										"lastLogin": "",
										"isClanMember": false,
										"leagueType": 0,
										"leagueVictoryCount": 0
									},
									"opponent": {
										"userId": 0,
										"tamerName": "",
										"tamerLevel": 0,
										"rankId": 0,
										"ranking": {
											"displayType": 0,
											"ranking": 0,
											"highRanking": 0,
											"lowRanking": 0
										},
										"bpPoint": 0,
										"rankName": "",
										"partnerUserDigimon": {
											"userDigimonId": 0,
											"digimonId": 0,
											"isLocked": false,
											"isEcLocked": false,
											"bit": 0,
											"level": 1,
											"maxLevel": 1,
											"friendshipPoint": 0,
											"maxFriendshipLevel": 20,
											"moodValue": 0.0,
											"skillLevel": 1,
											"executionLimitbreakId": 1,
											"completeTrainingIds": [],
											"wearingPluginList": [],
											"addFriendshipPointByPeriod": 0,
											"lastCareTime": "",
											"lastBrokenSlbNecessaryLevel": 0,
											"awakingLevel": 0
										},
										"winStreakCount": 0,
										"friendState": 0,
										"battleParkTeamList": [],
										"greetings": "",
										"lastLogin": "",
										"isClanMember": false,
										"leagueType": 0,
										"leagueVictoryCount": 0
									}
								},
								"bceData": {
									"bossIconAsset": ""
								},
								"slayerIds": [],
								"scenarioEventStatus": {
									"errorNumber": 0,
									"message": "",
									"action": "",
									"commonResponse": {
										"clearMissionIdList": [],
										"clearChallengeIdList": [],
										"tutorialInfo": {
											"tutorialType": 0,
											"tutorialState": 0
										}
									},
									"totalEventPoint": 0,
									"isClear": false,
									"userQuestList": [],
									"unlockSectionIds": []
								},
								"battleContinuePrice": 5,
								"startWave": 1
							},
							"_hasInfo": false,
							"_constructionData": {
								"waveList": [],
								"teamList": [],
								"rivalStartResponse": {
									"errorNumber": 0,
									"message": "",
									"action": "",
									"commonResponse": {
										"clearMissionIdList": [],
										"clearChallengeIdList": [],
										"tutorialInfo": {
											"tutorialType": 0,
											"tutorialState": 0
										}
									},
									"core": {
										"battleId": 0,
										"battleAsset": {
											"bgAsset": "",
											"skyboxAsset": "",
											"placementAsset": ""
										},
										"waveList": [],
										"floorSkill": {
											"skillId": 0,
											"level": 0
										}
									},
									"teamList": [],
									"currentRankId": 0,
									"currentBpPoint": 0,
									"currentRanking": {
										"displayType": 0,
										"ranking": 0,
										"highRanking": 0,
										"lowRanking": 0
									},
									"opponentRankId": 0,
									"opponentBpPoint": 0,
									"opponentRanking": {
										"displayType": 0,
										"ranking": 0,
										"highRanking": 0,
										"lowRanking": 0
									},
									"historyId": 0,
									"currentLeagueType": 0,
									"opponentLeagueType": 0
								},
								"mprStartResponse": {
									"errorNumber": 0,
									"message": "",
									"action": "",
									"commonResponse": {
										"clearMissionIdList": [],
										"clearChallengeIdList": [],
										"tutorialInfo": {
											"tutorialType": 0,
											"tutorialState": 0
										}
									},
									"core": {
										"battleId": 0,
										"battleAsset": {
											"bgAsset": "",
											"skyboxAsset": "",
											"placementAsset": ""
										},
										"waveList": [],
										"floorSkill": {
											"skillId": 0,
											"level": 0
										}
									},
									"teamList": [],
									"historyId": 0,
									"bossStatus": {
										"hp": 0,
										"attack": 0,
										"defense": 0,
										"isChangedHp": false,
										"isChangedAttack": false,
										"isChangedDefense": false
									}
								},
								"bossIconAsset": "",
								"battleCore": {
									"battleId": 0,
									"battleAsset": {
										"bgAsset": "",
										"skyboxAsset": "",
										"placementAsset": ""
									},
									"waveList": [],
									"floorSkill": {
										"skillId": 0,
										"level": 0
									}
								},
								"isResume": false
							},
							"_hasConstructionData": false,
							"_resumeData": {
								"elapsedTime": 0.0,
								"evaluationVariable": {
									"downCount": 0,
									"continueCount": 0,
									"killLeaderByMainSkillCount": 0,
									"killBossByMainSkillCount": 0,
									"killLeaderBySubSkillCount": 0,
									"killBossBySubSkillCount": 0,
									"killLeaderByFriendshipSkillCount": 0,
									"killBossByFriendshipSkillCount": 0
								},
								"startTurn": 0,
								"invokePassiveSkill": true,
								"invokeFloorSkill": true,
								"allDigimonVariable": [],
								"actorBattleDigimonIdList": [],
								"skillToken": 0,
								"dropItemCountList": [],
								"teamIdList": [],
								"battleLogAnalysis": {
									"_maxDamage": 0,
									"_maxDamageFormula": "",
									"attackedDigimonInfo": {
										"userDigimonId": -1,
										"isFriendshipSkill": false,
										"isBPBuff": false,
										"isSlayerBuff": false,
										"isIgnoreDefense": false,
										"actionId": -1,
										"buff": [],
										"debuff": [],
										"defense": 0,
										"hp": 0,
										"totalCorrectionValue": 0
									},
									"opponentDigimonInfo": {
										"digimonId": 0,
										"isBPBuff": false,
										"buff": [],
										"debuff": [],
										"defense": 0,
										"hp": 0
									},
									"_totalDamage": 0
								}
							},
							"_hasResumeData": false,
							"_collectingItemData": {},
							"_hasCollectingItemData": false,
							"requestSlayerIdList": [],
							"slayerIdList": [],
							"isActiveCorrelationDamage": true,
							"isActiveSuperPersonality": true,
							"_battleParkTopResponse": {
								"errorNumber": 0,
								"message": "",
								"action": "",
								"commonResponse": {
									"clearMissionIdList": [],
									"clearChallengeIdList": [],
									"tutorialInfo": {
										"tutorialType": 0,
										"tutorialState": 0
									}
								},
								"seasonIndex": 0,
								"rankId": 0,
								"bpPoint": 0,
								"winCount": 0,
								"loseCount": 0,
								"winStreakCount": 0,
								"beforeRankId": 1,
								"receivePrizeInfo": {
									"bpPoint": 0,
									"rankId": 0,
									"rank": 0,
									"rewardList": [],
									"textId": 0
								}
							},
							"_hasBattleParkTopResponse": false,
							"_battleParkRankingResponse": {
								"errorNumber": 0,
								"message": "",
								"action": "",
								"commonResponse": {
									"clearMissionIdList": [],
									"clearChallengeIdList": [],
									"tutorialInfo": {
										"tutorialType": 0,
										"tutorialState": 0
									}
								},
								"rank": -1,
								"topRankingList": [],
								"friendRankingList": [],
								"clanRankingList": []
							},
							"_hasBattleParkRankingResponse": false,
							"battleParkCampaignIds": [],
							"_beforeScenarioId": 0,
							"hasBeforeScenario": false,
							"isBP2": false,
							"bp2ConstructData": {
								"isRankupBattle": false,
								"currentRankId": 0,
								"leagueVictoryCount": 0,
								"currentLeagueType": 0,
								"ranking": {
									"displayType": 0,
									"ranking": 0,
									"highRanking": 0,
									"lowRanking": 0
								},
								"bpPoint": 0,
								"winStreakCount": 0,
								"slayerIds": [],
								"opponentUserId": -1
							},
							"_guestUserDigimon": {
								"userDigimonId": 0,
								"digimonId": 0,
								"isLocked": false,
								"isEcLocked": false,
								"bit": 0,
								"level": 1,
								"maxLevel": 1,
								"friendshipPoint": 0,
								"maxFriendshipLevel": 20,
								"moodValue": 0.0,
								"skillLevel": 1,
								"executionLimitbreakId": 1,
								"completeTrainingIds": [],
								"wearingPluginList": [],
								"addFriendshipPointByPeriod": 0,
								"lastCareTime": "",
								"lastBrokenSlbNecessaryLevel": 0,
								"awakingLevel": 0
							},
							"_hasGuestUserDigimon": false,
							"dfqEventId": 0,
							"ecId": ecTop.ecId,
							"ecFloorInfo": floorInfo,
							"ecProgressInfo": userProgressInfo,
							"rivalConstructData": {
								"opponent": {
									"userId": 0,
									"tamerName": "",
									"tamerLevel": 0,
									"partnerUserDigimon": {
										"userDigimonId": 0,
										"digimonId": 0,
										"isLocked": false,
										"isEcLocked": false,
										"bit": 0,
										"level": 1,
										"maxLevel": 1,
										"friendshipPoint": 0,
										"maxFriendshipLevel": 20,
										"moodValue": 0.0,
										"skillLevel": 1,
										"executionLimitbreakId": 1,
										"completeTrainingIds": [],
										"wearingPluginList": [],
										"addFriendshipPointByPeriod": 0,
										"lastCareTime": "",
										"lastBrokenSlbNecessaryLevel": 0,
										"awakingLevel": 0
									},
									"battleParkTeamList": []
								},
								"opponentMembers": [],
								"nextSceneName": 2
							},
							"xlbConstructData": {
								"userDigimonIdList": [],
								"helperList": [],
								"sectionId": 0,
								"questId": 0,
								"lastQuest": false
							},
							"bceConstructData": {
								"eventId": 0,
								"questGroupId": 0,
								"eventPointItemId": 0,
								"prizeResponse": {
									"errorNumber": 0,
									"message": "",
									"action": "",
									"commonResponse": {
										"clearMissionIdList": [],
										"clearChallengeIdList": [],
										"tutorialInfo": {
											"tutorialType": 0,
											"tutorialState": 0
										}
									},
									"eventPrizeList": []
								},
								"questId": 0,
								"questStaminaCost": 0,
								"battleId": 0,
								"userDigimonIdList": [],
								"teamId": 0,
								"nextQuestId": 0
							},
							"mprConstructData": {
								"mprId": 0,
								"isMprPeriod": false,
								"mprTitleTextId": 0,
								"mprQuest": {
									"questId": 0,
									"startDate": "",
									"bossTotalHp": 0,
									"bossCurrentHp": 0,
									"bossTotalDamage": 0,
									"titleTextId": 0,
									"staminaCost": 0,
									"userExp": 0,
									"gainFriendship": 0,
									"battleId": 0,
									"prizeList": []
								},
								"playScenarioDataList": []
							}
						}
					),
				})
				historyId = ecStart.historyId
			}

			let opponentDigimonId = 0, opponentHp = 0, opponentDefense = 0, totalOpponentHp = 0
			for (const wave of ecStart.core.waveList) {
				for (const opponent of wave.digimonInfoList) {
					const growthType = (await masters.digimon).get(opponent.digimonDetail.digimonId)!.growthType
					opponentDigimonId = opponent.digimonDetail.digimonId
					const growth = (await masters.digimonParameter).get(growthType)!
					opponentHp = calcStat(growth, opponent.digimonDetail.level, 'hp')
					opponentDefense = calcStat(growth, opponent.digimonDetail.level, 'defense')
					totalOpponentHp += opponentHp
				}
			}

			const ecClear = await session.ecClear({
				historyId,
				digimonStatusList: userProgressInfo.digimonStatusList,
				friendshipSkillCoolTime: userProgressInfo.friendshipSkillCoolTime,
				friendshipSkillCount: 0,
				participationTeamIdList: [teamId],
				logInfo: {
					"attackedDigimonInfo": {
						"actionId": teamDigimonParameterList[0]!.battleDigimonDetail.digimonId * 10 + 1,
						"buff": [],
						"debuff": [],
						"defense": teamDigimonParameterList[0]!.battleDigimonDetail.defense,
						"hp": teamDigimonParameterList[0]!.battleDigimonDetail.hp,
						"isBPBuff": false,
						"isFriendshipSkill": false,
						"isIgnoreDefense": false,
						"isSlayerBuff": false,
						"totalCorrectionValue": 100,
						"userDigimonId": teamDigimonParameterList[0]!.userDigimonId,
					},
					digimonParameterList: allTeamsDigimonParameterList,
					helperDigimonParameter,
					"historyId": historyId,
					"maxDamage": Math.ceil(300 * teamDigimonParameterList[0]!.battleDigimonDetail.attack * 2.00 * 1.5 / (100 + opponentDefense)),
					"maxDamageFormula": `${teamDigimonParameterList[0]!.battleDigimonDetail.attack}:300:100:${opponentDefense}:1:200:1:1.5:1:1:1:1:1:1:1:1:1:1:1:1`,
					partnerDigimonParameter: teamDigimonParameterList[0]!,
					"targetDigimonInfo": {
						"buff": [],
						"debuff": [],
						"defense": opponentDefense,
						"digimonId": opponentDigimonId,
						"hp": opponentHp,
						"isBPBuff": false
					},
					"totalDamage": totalOpponentHp
				},
			})

			// all are already maxed
			// for (const digimonFriendshipPoint of ecClear.digimonFriendshipPointList) {
			// 	const userDigimon = session.userData.userDigimonList.find(ud => ud.userDigimonId === digimonFriendshipPoint.userDigimonId)
			// 	if (userDigimon) {
			// 		userDigimon.friendshipPoint = digimonFriendshipPoint.afterFriendshipPoint
			// 	}
			// }

			session.userData.personal.staminaMax = (await masters.tamerLevel).get(ecClear.tamerLevel)!.staminaLimit
			session.userData.personal.stamina = ecClear.recoveredStamina
			session.userData.personal.staminaChangeTime = ecClear.staminaChangeTime
			historyId = undefined
		}
	}
	console.log('\x07')
}

class Director {
	totalUsers: number
	staminaRecoveringUsers: number
	warmupComplete: boolean
	promises: Promise<unknown>[]

	constructor(readonly db: mysql.Pool) {
		this.db = db
		this.totalUsers = this.staminaRecoveringUsers = 0
		this.warmupComplete = false
		this.promises = []
	}

	startRecoveringStamina() {
		this.staminaRecoveringUsers++
		while (this.warmupComplete && this.totalUsers - this.staminaRecoveringUsers < 1) {
			// if (Math.random() < 0.5)
				this.promises.push(createUser(this, this.db, servers.ww, [api.OsType.Android, api.OsType.iOS][Math.random() * 2 | 0]!, ([api.LanguageCodeType.En, api.LanguageCodeType.Ko, api.LanguageCodeType.Zh] as const)[Math.random() * 3 | 0]!))
			// else
			// 	this.promises.push(createUser(this, this.db, servers.jp, [api.OsType.Android, api.OsType.iOS][Math.random() * 2 | 0]!, api.LanguageCodeType.Ja))
			this.totalUsers++
		}
	}

	endRecoveringStamina() {
		this.staminaRecoveringUsers--
	}

	// async all() {
	// 	for (;;) {
	// 		const promises = this.promises
	// 		if (!promises.length)
	// 			return
	// 		this.promises = []
	// 		await Promise.all(promises)
	// 	}
	// }
}

async function createUser<ConstrainedLanguageCodeType extends api.LanguageCodeType>(director: Director, db: mysql.Pool, server: Server<ConstrainedLanguageCodeType>, osType: api.OsType, languageCodeType: ConstrainedLanguageCodeType) {
	const uuid = crypto.randomBytes(16).toString('hex')
	const session = await DigiriseSession.create(server, {
		osType,
		adId: `${uuid.substring(0, 8)}-${uuid.substring(8, 12)}-${uuid.substring(12, 16)}-${uuid.substring(16, 20)}-${uuid.substring(20)}`,
		userId: 0,
		uuid,
		validationCode: uuid,
		languageCodeType,
	}, {
		agent: {
			https: new SocksProxyAgent('socks://127.0.0.1:9050'),
		},
	})
	await session.userCreate()
	await db.execute(
		'insert into `bot_accounts` (`user_id`, `uuid`, `language_code_type`, `os_type`, `max_stamina`, `stamina`, `stamina_change_time`) values (?, ?, ?, ?, ?, ?, from_unixtime(?))',
		[
			session.user.userId,
			uuid,
			languageCodeType,
			osType,
			session.userData.personal.staminaMax,
			session.userData.personal.stamina,
			parseDate(session.userData.personal.staminaChangeTime).getTime() / 1000,
		],
	)
	return doTutorialAndBattles(director, db, server, session)
}

async function resumeUsers(director: Director, db: mysql.Pool) {
	let [rows, fields] = await db.query<mysql.RowDataPacket[]>("select * from `bot_accounts`")
	const wwRows = rows.filter(row => row.language_code_type !== api.LanguageCodeType.Ja)
	const jpRows = rows.filter(row => row.language_code_type === api.LanguageCodeType.Ja)
	jpRows.splice(5)
	rows = wwRows.concat(jpRows)
	director.totalUsers += rows.length
	director.warmupComplete = true
	// console.dir([rows, fields], {depth: null})
	const promises = rows.map(async row => {
		const server = row.language_code_type === api.LanguageCodeType.Ja ? servers.jp : servers.ww
		await sleep(1000 * (server === servers.jp ? 300 : 120) * Math.random())
		const session = await DigiriseSession.create<any>(server, {
			osType: row.os_type,
			adId: `${row.uuid.substring(0, 8)}-${row.uuid.substring(8, 12)}-${row.uuid.substring(12, 16)}-${row.uuid.substring(16, 20)}-${row.uuid.substring(20)}`,
			userId: row.user_id,
			uuid: row.uuid,
			validationCode: row.uuid,
			languageCodeType: row.language_code_type,
		}, {
			agent: {
				https: new SocksProxyAgent('socks://127.0.0.1:9050'),
			},
		})
		// await session.userGetAll()
		let historyId: number | undefined = (session.userData.userResumeQuest as any).questHistoryId
		if (!historyId && (!session.user.tutorialInfo || session.user.tutorialInfo.tutorialType !== api.TutorialType.FirstTutorial)) {
			const statusEvery = await session.homeStatusEvery()
			// if (statusEvery.newChallengeGroupIdList) {
			// 	for (const challengeGroupId of statusEvery.newChallengeGroupIdList) {
			// 		await session.gotApi('challenge/start', {challengeGroupId})
			// 	}
			// }
			if (statusEvery.homeScenarioInfoList) {
				for (const homeScenarioInfo of statusEvery.homeScenarioInfoList) {
					await session.gotApi('home/readScenario', {scenarioId: homeScenarioInfo.scenarioId})
				}
			}
			// if (!statusEvery.battleResume && statusEvery.questHistoryId > 0) {
			// 	console.log(stripResponse(await session.gotApi('quest/retire', {historyId: statusEvery.questHistoryId, isSkipStartScenario: false})))
			// 	// console.log(stripResponse(await session.gotApi('quest/defeated', {historyId: statusEvery.questHistoryId, isSkipStartScenario: false})))
			// }
			historyId = statusEvery.battleResume?.historyId
			if (statusEvery.unreceivedMissionIds.length)
				await session.missionReceive(statusEvery.unreceivedMissionIds)
			if (statusEvery.unreceivedPresentCount) {
			}
		}
		return doTutorialAndBattles<any>(director, db, server, session, historyId)
	})
	for (const promise of promises)
		director.promises.push(promise)
}

function round(x: number) {
	const r = Math.round(x)
	return r - x === 0.5 && r % 2 ? r - 1 : r
}

function calcStat(growth: ValueType<master.DigimonParameterMaster>, level: number, stat: 'attack' | 'defense' | 'hp' | 'defense' | 'speed'/*, slb?: Map<number, SlbParameterMasterParam>*/): number {
	const baseLevel = Math.min(99, level)

	// FIXME: test whether rounding happens before training/limitbreak
	const i = growth.findIndex(p => p.level >= baseLevel)
	if (i < 0)
		throw new Error
	const lub = growth[i]!
	let value
	if (lub.level === baseLevel)
		value = lub[stat]
	else if (!i)
		throw new Error
	else {
		const glb = growth[i - 1]!
		value = round((glb[stat] * (lub.level - baseLevel) + lub[stat] * (baseLevel - glb.level)) / (lub.level - glb.level))
	}

	// if (level > 99) {
	// 	const slbLevel = slb.get(level)
	// 	if (!slbLevel)
	// 		throw new Error
	// 	value += slbLevel[stat]
	// }

	return value
}

const helperDigimonParameter: api.BattleLogParameterInfo = {
	battleDigimonDetail: {
		userDigimonId: 0,
		digimonId: 0,
		awakingLevel: 0,
		generation: 0,
		level: 1,
		friendshipPoint: 0,
		friendshipLevel: 0,
		moodValue: 0,
		skillLevel: 0,
		executionLimitbreakId: 1,
		completeTrainingIds: [],
		lastBrokenSlbNecessaryLevel: 0,
		wearingPluginList: [],
		hp: 0,
		attack: 0,
		defense: 0,
		speed: 0,
	},
	parameterHash: '',
	parameterRaw: '',
	userDigimonId: 0,
}

async function doTutorialAndBattles<ConstrainedLanguageCodeType extends api.LanguageCodeType>(director: Director, db: mysql.Pool, server: Server<ConstrainedLanguageCodeType>, session: DigiriseSession<ConstrainedLanguageCodeType>, historyId?: number) {
try {
	const masters = server.masters[session.user.languageCodeType]
	const [
		digimonMaster,
		digimonFriendshipLevelMaster,
		digimonParameterMaster,
		questMaster,
		tamerLevelMaster,
		weeklyLimitMaster,
		weeklyLimitCountMaster,
		weeklyLimitOpenMaster,
		weeklyQuestMaster,
	] = await Promise.all([
		masters.digimon,
		masters.digimonFriendshipLevel,
		masters.digimonParameter,
		masters.quest,
		masters.tamerLevel,
		masters.weeklyLimit,
		masters.weeklyLimitCount,
		masters.weeklyLimitOpen,
		masters.weeklyQuest,
	])

	function progressQuest(questId: number) {
		const userQuest = session.userData.userQuestList.find(uq => uq.questId === questId)
		if (userQuest) {
			userQuest.playState = api.QuestPlayState.Clear
			const releaseQuestId = questMaster.get(questId)!.releaseQuestId
			if (releaseQuestId && !session.userData.userQuestList.some(uq => uq.questId === releaseQuestId)) {
				session.userData.userQuestList.push({
					questId: releaseQuestId,
					playState: api.QuestPlayState.New,
					clearedEvaluationIdList: [],
				})
				session.userData.userQuestList.sort((a, b) => a.questId - b.questId)
			}
		}
	}

	const teamUserDigimonIdList = [
		session.userData.personal.partnerDigimonId,
		-1, // gashaRoll.prizeInfoList[0].prizeInfo.userDigimon.userDigimonId,
		-1, // gashaRoll.prizeInfoList[1].prizeInfo.userDigimon.userDigimonId,
		-1, // gashaRoll.prizeInfoList[2].prizeInfo.userDigimon.userDigimonId,
		-1, // gashaRoll.prizeInfoList[3].prizeInfo.userDigimon.userDigimonId,
	]
	let tutorialInfo = session.user.tutorialInfo
	if (tutorialInfo && !historyId) switch (tutorialInfo.tutorialType) {
	case api.TutorialType.FirstTutorial:
		switch (tutorialInfo.tutorialState) {
		case api.FirstTutorialState.Prologue:
			await session.tutorialProgress(api.TutorialType.FirstTutorial, api.FirstTutorialState.Prologue)
		case api.FirstTutorialState.Scenario1:
			await session.tutorialProgress(api.TutorialType.FirstTutorial, api.FirstTutorialState.Scenario1)
		case api.FirstTutorialState.BattleBaseIntroduction:
			await session.tutorialProgress(api.TutorialType.FirstTutorial, api.FirstTutorialState.BattleBaseIntroduction)
			progressQuest(1001010)
		case api.FirstTutorialState.Scenario2:
			// const startMs = Date.now()
			// await sleep(1000)
			// let backoffMs = 100, attempt = 1
			// while (keepGoing()) {
			// 	try {
			// 		const lastAttemptMs = Date.now()
					await session.tutorialProgress(api.TutorialType.FirstTutorial, api.FirstTutorialState.Scenario2)
			// 		log(`Progressing beyond scenario 2 took ${attempt} attempt(s) and a total delay of ${(lastAttemptMs - startMs) / 1000} s.`)
			// 		break
			// 	} catch (e) {
			// 		if (!(e instanceof DigiriseError) || e.errorNumber !== api.ErrorNumber.ServerError)
			// 			throw e
			// 		await sleep(backoffMs)
			// 		backoffMs *= 2
			// 		attempt += 1
			// 	}
			// }
			progressQuest(1001011)
		case api.FirstTutorialState.Scenario3:
			await session.tutorialProgress(api.TutorialType.FirstTutorial, api.FirstTutorialState.Scenario3)
		case api.FirstTutorialState.DropAndAutoIntroduction:
			await session.tutorialProgress(api.TutorialType.FirstTutorial, api.FirstTutorialState.DropAndAutoIntroduction)
			progressQuest(1001020)
		case api.FirstTutorialState.Scenario4:
			await session.tutorialProgress(api.TutorialType.FirstTutorial, api.FirstTutorialState.Scenario4)
			progressQuest(1001021)
		case api.FirstTutorialState.Scenario5:
			await session.tutorialProgress(api.TutorialType.FirstTutorial, api.FirstTutorialState.Scenario5)
		case api.FirstTutorialState.BossBattle:
			await session.tutorialProgress(api.TutorialType.FirstTutorial, api.FirstTutorialState.BossBattle)
		case api.FirstTutorialState.BattleAfterScenario:
			await session.tutorialProgress(api.TutorialType.FirstTutorial, api.FirstTutorialState.BattleAfterScenario)
			progressQuest(1001030)
		case api.FirstTutorialState.DownLoadConfirm:
			await session.tutorialProgress(api.TutorialType.FirstTutorial, api.FirstTutorialState.DownLoadConfirm)
		case api.FirstTutorialState.Download:
			// await session.checkMastersAndResources(true)
			await session.tutorialProgress(api.TutorialType.FirstTutorial, api.FirstTutorialState.Download)
		case api.FirstTutorialState.Home:
			await session.tutorialProgress(api.TutorialType.FirstTutorial, api.FirstTutorialState.Home)
		case api.FirstTutorialState.Reinforcement:
			await session.tutorialProgress(api.TutorialType.FirstTutorial, api.FirstTutorialState.Reinforcement)
			session.userData.userDigimonList[0]!.level = 5
		case api.FirstTutorialState.Gasha:
			const gashaRoll = await session.gashaRoll(901)
			await db.execute(
				'insert into `gasha_roll` (`server`, `gasha_id`, `user_id`, `response`) values (?, ?, ?, ?)',
				[
					server.apiUrlBase.match(/\/\/([^/]+)\//)![1]!,
					901,
					session.user.userId,
					JSON.stringify(stripResponse(gashaRoll)),
				],
			)
			for (const gashaPrizeInfo of gashaRoll.prizeInfoList)
				session.userData.userDigimonList.push(gashaPrizeInfo.prizeInfo.userDigimon!)
		case api.FirstTutorialState.TeamEdit:
			await session.digimonTeamEdit([
				{
					teamId: 1001,
					userDigimonList: teamUserDigimonIdList,
				},
			])
		case api.FirstTutorialState.MissionFirstTutorialClear:
			await session.tutorialProgress(api.TutorialType.FirstTutorial, api.FirstTutorialState.MissionFirstTutorialClear)
		case api.FirstTutorialState.MissionDescription:
			await session.missionReceive([316000])
		case api.FirstTutorialState.LastMessage:
			await session.tutorialProgress(api.TutorialType.FirstTutorial, api.FirstTutorialState.LastMessage)
			await Promise.all([
				// db.execute(
				// 	'update `bot_accounts` set `max_stamina` = 31, `stamina` = 51 where `uuid` = ?',
				// 	[
				// 		session.user.uuid,
				// 	],
				// ),
				session.tutorialProgress(api.TutorialType.FunctionalTutorialOfFirstQuestIntroduction, api.CommonTutorialState.Start),
			])
			tutorialInfo = session.user.tutorialInfo!
		}
	case api.TutorialType.FunctionalTutorialOfFirstQuestIntroduction:
		switch (tutorialInfo.tutorialState) {
		case api.CommonTutorialState.Progress:
			await session.tutorialProgress(api.TutorialType.FunctionalTutorialOfFirstQuestIntroduction, api.CommonTutorialState.Progress)
			await session.ensureHomeLogin()
			tutorialInfo = session.user.tutorialInfo!
			return
		}
	}
	function isWeeklySectionOpen(sectionId: number) {
		const weeklyLimitList = weeklyLimitMaster.get(sectionId)
		if (!weeklyLimitList)
			throw new Error('isWeeklySectionOpen called on something other than a limit-open weekly section')

		const now = Date.now()

		const weeklyLimit = weeklyLimitList.find(weeklyLimit => parseDate(weeklyLimit.activeStartDate).getTime() <= now && now < parseDate(weeklyLimit.activeEndDate).getTime())
		if (!weeklyLimit)
			return false

		const weeklyLimitCount = weeklyLimitCountMaster.get(weeklyLimit.countId)!
		const weeklyLimitOpenList = weeklyLimitOpenMaster.get(weeklyLimit.openId)!

		return weeklyLimitOpenList.some(weeklyLimitOpen => {
			const open = (weeklyLimitOpen.openDayOfWeek % 7) * 86400000 + parseTime(weeklyLimitOpen.openTime)
			const close = (weeklyLimitOpen.closeDayOfWeek % 7) * 86400000 + (parseTime(weeklyLimitOpen.closeTime) + 1000)
			const weeklyMs = (now - 1649516400000) % 604800000
			if (close > open)
				return weeklyMs >= open && weeklyMs < close
			else
				return weeklyMs >= open || weeklyMs < close
		})
	}
	async function doQuest(): Promise<number> {
		const teamUserDigimonList = [
			session.userData.userDigimonList.find(ud => ud.userDigimonId === session.userData.personal.partnerDigimonId)!,
			// gashaRoll.prizeInfoList[0].prizeInfo.userDigimon,
			// gashaRoll.prizeInfoList[1].prizeInfo.userDigimon,
			// gashaRoll.prizeInfoList[2].prizeInfo.userDigimon,
			// gashaRoll.prizeInfoList[3].prizeInfo.userDigimon,
		]
		const digimonParameterList: api.BattleLogParameterInfo[] = teamUserDigimonList.map(userDigimon => {
			const digimon = digimonMaster.get(userDigimon.digimonId)!
			const growth = digimonParameterMaster.get(digimon.growthType)!
			return {
				battleDigimonDetail: {
					userDigimonId: userDigimon.userDigimonId,
					digimonId: userDigimon.digimonId,
					awakingLevel: userDigimon.awakingLevel,
					generation: digimon.generation,
					level: userDigimon.level,
					friendshipPoint: userDigimon.friendshipPoint,
					friendshipLevel: Array.from(digimonFriendshipLevelMaster.get(digimon.evolutionaryType)!.values()).sort((a, b) => b.friendshipLevel - a.friendshipLevel).find(fl => userDigimon.friendshipPoint >= fl.totalFriendshipPoint)!.friendshipLevel,
					moodValue: userDigimon.moodValue,
					skillLevel: userDigimon.skillLevel,
					executionLimitbreakId: userDigimon.executionLimitbreakId,
					completeTrainingIds: userDigimon.completeTrainingIds,
					lastBrokenSlbNecessaryLevel: userDigimon.lastBrokenSlbNecessaryLevel,
					wearingPluginList: [], /*userDigimon.wearingPluginList.map(wp => ({
						slotId: wp.slotId,
						userPluginId: wp.userPluginId,
						pluginId: ,
						strengtheningValue: ,
					})),*/
					// hp: 527,
					// attack: 324,
					// defense: 162,
					// speed: 21,
					hp: calcStat(growth, userDigimon.level, 'hp'),
					attack: calcStat(growth, userDigimon.level, 'attack'),
					defense: calcStat(growth, userDigimon.level, 'defense'),
					speed: calcStat(growth, userDigimon.level, 'speed'),
				},
				parameterHash: '455af89e00dccd934a3d16e1be58cf84',
				parameterRaw: '',
				userDigimonId: userDigimon.userDigimonId,
			}
		})
		let quest: any, questId: number
		if (historyId) {
			try {
				quest = await session.gotApi('quest/resume', {historyId})
			} catch (e) {
				if (!(e instanceof DigiriseError) || e.errorNumber !== api.ErrorNumber.ServerError)
					throw e
				console.error('Retreating from battle that could not be resumed... WTF?')
				await session.gotApi('quest/retire', {historyId, isSkipStartScenario: false})
				historyId = undefined
				return doQuest()
			}
			questId = JSON.parse(quest.resumeInfo).battleContentId
			if (questId !== undefined) {
				await db.execute(
					'insert ignore into `quest_start` (`server`, `quest_id`, `user_id`, `history_id`, `response`) values (?, ?, ?, ?, ?)',
					[
						server.apiUrlBase.match(/\/\/([^/]+)\//)![1]!,
						questId,
						session.user.userId,
						historyId,
						JSON.stringify(stripResponse((({resumeInfo, ...rest}) => rest)(quest))),
					],
				)
			}
			historyId = undefined
		} else {
			const staminaMax = session.userData.personal.staminaMax
			const stamina = Math.max(
				session.userData.personal.stamina,
				Math.min(
					staminaMax,
					session.userData.personal.stamina + (Date.now() - (parseDate(session.userData.personal.staminaChangeTime).getTime() + 1000)) / 180000
				),
			)
			const effectiveStaminaMax = Math.max(stamina, staminaMax)
			let nextUserQuest = session.userData.userQuestList.filter(uq => uq.playState !== api.QuestPlayState.Clear && effectiveStaminaMax >= questMaster.get(uq.questId)!.staminaCost).sort((a, b) => a.questId - b.questId)[0]
			let questType
			/*if (nextUserQuest && questMaster.get(nextUserQuest.questId)!.sectionId === 1002) {
				questId = nextUserQuest.questId
				questType = api.QuestType.Adventure
			} else*/ if (isWeeklySectionOpen(2601) && !(await session.gotApi<any>('weekly/timesInfo')).weeklyQuestTimesInfoList.find((i: any) => i.weeklySectionId === 2601)!.count) {
				questId = 260101
				questType = api.QuestType.Weekly
			} else {
				if (!nextUserQuest) {
					nextUserQuest = session.userData.userQuestList.filter(uq => effectiveStaminaMax >= questMaster.get(uq.questId)!.staminaCost).sort((a, b) => questMaster.get(b.questId)!.userExp - questMaster.get(a.questId)!.userExp)[0]
					if (!nextUserQuest)
						throw new Error('Failed to find a quest that fits within staminaMax.')
				}
				questId = nextUserQuest.questId
				questType = api.QuestType.Adventure
			}
			const staminaCost = questType === api.QuestType.Weekly ? weeklyQuestMaster.get(questId)!.staminaCost : questMaster.get(questId)!.staminaCost
			if (stamina < staminaCost) {
				director.startRecoveringStamina()
				await sleep((staminaCost - session.userData.personal.stamina) * 180000 + (parseDate(session.userData.personal.staminaChangeTime).getTime() + 1000) - Date.now())
				director.endRecoveringStamina()
			}
			if (questType !== api.QuestType.Weekly && !questMaster.get(questId)!.battleId) {
				if (staminaCost)
					throw new Error(`Cutscene quest ${questId} costs stamina`)
				await session.gotApi('quest/progress', {
					questId,
					questType,
				})
				return questId
			} else {
				// const maxAttempts = 10
				// for (let i = 1; i <= maxAttempts; i++) {
				// 	try {
						quest = await session.questStart({
							questId,
							questType,
							teamId: 1001,
							helperUserId: -1,
							slayerIdList: [],
							resumeInfo: JSON.stringify({battleContentId: questId}),
							digimonParameterList,
							partnerDigimonParameter: digimonParameterList[0]!,
							helperDigimonParameter,
						})
				// 		break
				// 	} catch (e) {
				// 		if (i === maxAttempts || !(e instanceof DigiriseError) || e.errorNumber !== api.ErrorNumber.ServerError)
				// 			throw e
				// 		await sleep(1000)
				// 	}
				// }
				await db.execute(
					'insert into `quest_start` (`server`, `quest_id`, `user_id`, `history_id`, `response`) values (?, ?, ?, ?, ?)',
					[
						server.apiUrlBase.match(/\/\/([^/]+)\//)![1]!,
						questId,
						session.user.userId,
						quest.historyId,
						JSON.stringify(stripResponse(quest)),
					],
				)
			}
		}
		let opponentDigimonId = 0, opponentHp = 0, opponentDefense = 0, totalOpponentHp = 0
		for (const wave of quest.waveList) {
			for (const opponent of wave.digimonOpponentList) {
				const growthType = digimonMaster.get(opponent.digimonId)!.growthType
				opponentDigimonId = opponent.digimonId
				const growth = digimonParameterMaster.get(growthType)!
				opponentHp = calcStat(growth, opponent.level, 'hp')
				opponentDefense = calcStat(growth, opponent.level, 'defense')
				totalOpponentHp += opponentHp
			}
		}
		const clear = await session.gotApi('quest/clear', {
			historyId: quest.historyId,
			friendshipSkillCount: 0,
			clearedEvaluationIdList: [],
			isSkipStartScenario: false,
			downCount: 0,
			elapsedTime: 46,
			logInfo: {
				"attackedDigimonInfo": {
					"actionId": digimonParameterList[0]!.battleDigimonDetail.digimonId * 10 + 1,
					"buff": [],
					"debuff": [],
					"defense": digimonParameterList[0]!.battleDigimonDetail.defense,
					"hp": digimonParameterList[0]!.battleDigimonDetail.hp,
					"isBPBuff": false,
					"isFriendshipSkill": false,
					"isIgnoreDefense": false,
					"isSlayerBuff": false,
					"totalCorrectionValue": 100,
					"userDigimonId": digimonParameterList[0]!.userDigimonId,
				},
				digimonParameterList,
				helperDigimonParameter,
				"historyId": quest.historyId,
				"maxDamage": Math.ceil(300 * digimonParameterList[0]!.battleDigimonDetail.attack * 2.00 * 1.5 / (100 + opponentDefense)),
				"maxDamageFormula": `${digimonParameterList[0]!.battleDigimonDetail.attack}:300:100:${opponentDefense}:1:200:1:1.5:1:1:1:1:1:1:1:1:1:1:1:1`,
				partnerDigimonParameter: digimonParameterList[0]!,
				"targetDigimonInfo": {
					"buff": [],
					"debuff": [],
					"defense": opponentDefense,
					"digimonId": opponentDigimonId,
					"hp": opponentHp,
					"isBPBuff": false
				},
				"totalDamage": totalOpponentHp
			},
		})
		// console.dir(stripResponse(clear), {depth: null})

		session.userData.personal.staminaMax = tamerLevelMaster.get(clear.tamerLevel)!.staminaLimit
		session.userData.personal.stamina = clear.recoveredStamina
		session.userData.personal.staminaChangeTime = clear.staminaChangeTime

		const promises = [
			db.execute(
				'update `bot_accounts` set `max_stamina` = ?, `stamina` = ?, `stamina_change_time` = from_unixtime(?) where `uuid` = ?',
				[
					session.userData.personal.staminaMax,
					session.userData.personal.stamina,
					parseDate(session.userData.personal.staminaChangeTime).getTime() / 1000,
					session.user.uuid,
				],
			),
		]
		if (questId !== undefined) {  // can happen if I'm resuming a battle I previously started with a bad resumeInfo
			promises.push(db.execute(
				'insert into `quest_clear` (`server`, `quest_id`, `user_id`, `response`) values (?, ?, ?, ?)',
				[
					server.apiUrlBase.match(/\/\/([^/]+)\//)![1]!,
					questId,
					session.user.userId,
					JSON.stringify(stripResponse(clear)),
				],
			))
		}
		await Promise.all(promises)

		for (const digimonFriendshipPoint of clear.digimonFriendshipPointList) {
			const userDigimon = session.userData.userDigimonList.find(ud => ud.userDigimonId === digimonFriendshipPoint.userDigimonId)
			if (userDigimon) {
				userDigimon.friendshipPoint = digimonFriendshipPoint.afterFriendshipPoint
			}
		}

		return questId
	}

	for (;;) {
		const questId = await doQuest()
		progressQuest(questId)
	}
} catch (e) {
	if (!(e instanceof DigiriseError) || e.errorNumber !== api.ErrorNumber.ServerError)
		throw e
	console.error(e)
}
}

// async function keepCreatingUsers<ConstrainedLanguageCodeType extends api.LanguageCodeType>(db: mysql.Pool, server: Server<ConstrainedLanguageCodeType>, osType: api.OsType, languages: ConstrainedLanguageCodeType[]) {
// 	for (let i = Math.random() * languages.length | 0; ; i = (i + 1) % languages.length) {
// 		await createUser(db, server, osType, languages[i]!)
// 		break
// 	}
// }

Error.stackTraceLimit = Infinity;

/*run*/(async () => {
	const promises: Promise<unknown>[] = []
	/*
	for (const uuid of process.argv.slice(2))
		promises.push(handleUser(uuid))
	*/
	// promises.push(handleUser(servers.jp, mainJpUser))

	// const user: User<api.LanguageCodeType.Ja> = {
	// 	osType: api.OsType.Android,
	// 	adId: 'f5c8b10e-e85f-4131-8216-7710d807f4ff',
	// 	userId: 4213771,
	// 	uuid: 'e82734db54af43bebf5c53cfdd69c3b3',
	// 	validationCode: '8cf07ff89c25d55d9c16f5c1c036a29e',
	// 	languageCodeType: api.LanguageCodeType.Ja,
	// 	// userData: JSON.parse(fs.readFileSync('0054bac9c220839cc732093fcad7968f', 'utf8')),
	// }
	// const user: User<api.LanguageCodeType.Ko> = {
	// 	osType: api.OsType.Android,
	// 	adId: 'f5c8b10e-e85f-4131-8216-7710d807f4ff',
	// 	userId: 7261225,
	// 	uuid: '6210a00a65ec423d801e94cf6e3804cc',
	// 	validationCode: '8cf07ff89c25d55d9c16f5c1c036a29e',
	// 	languageCodeType: api.LanguageCodeType.Ko,
	// 	// userData: JSON.parse(fs.readFileSync('0054bac9c220839cc732093fcad7968f', 'utf8')),
	// }
	// const user: User<api.LanguageCodeType.En> = {
	// 	osType: api.OsType.Android,
	// 	adId: 'f5c8b10e-e85f-4131-8216-7710d807f4ff',
	// 	userId: 7264897,
	// 	uuid: '912f5651a92641e0baa24d5ddc13ddac',
	// 	validationCode: '8cf07ff89c25d55d9c16f5c1c036a29e',
	// 	languageCodeType: api.LanguageCodeType.En,
	// 	// userData: JSON.parse(fs.readFileSync('0054bac9c220839cc732093fcad7968f', 'utf8')),
	// }
	// const user: User<api.LanguageCodeType.En> = {
	// 	osType: api.OsType.iOS,
	// 	adId: 'f5c8b10e-e85f-4131-8216-7710d807f4ff',
	// 	userId: 1684705,
	// 	uuid: '627549cacdcb371c79cd0b033dc263a4',
	// 	validationCode: '8cf07ff89c25d55d9c16f5c1c036a29e',
	// 	languageCodeType: api.LanguageCodeType.En,
	// 	// userData: JSON.parse(fs.readFileSync('0054bac9c220839cc732093fcad7968f', 'utf8')),
	// }
	// promises.push((async () => {
		const session = await DigiriseSession.createSlim(servers.jp, mainJpUser)
	// 	// const session = await DigiriseSession.createSlim(servers.jp, user)
		// const session = await DigiriseSession.createSlim(servers.ww, {...searchGlobalUser, languageCodeType: api.LanguageCodeType.Zh}, {verbose: true})
		// const session = await DigiriseSession.createSlim(servers.ww, user, {verbose: true})
		// await session.userGetAll()
	// 	// console.dir(stripResponse(await session.gotApi('raid/top')), {depth: null})
	// 	// for (const event of (await session.gotApi('sideMenu/getEvent')).raidEventInSessionList) {
	// 	// 	const eventId = event.eventId
	// 	// 	await session.gotApi('raid/getEventTop', {eventId})
	// 	// 	// await session.gotApi('raidRanking/top', {eventId})
	// 	// }
		// await session.gotApi('friend/search', {friendCode: '402519294'})
		await session.gotApi('app/contact')
		try { await session.gotApi('bp2/trend') } catch (e) { console.error(e) }
		try { await session.gotApi('user/getAll') } catch (e) { console.error(e) }
	// 	// await session.gotApi('migration/restorePassword', {
	// 	// 	friendCode: '333675920',
	// 	// 	password: 'ccb2dwtrhqAV',
	// 	// 	uuid: session.user.uuid,
	// 	// 	platformType: session.user.osType as number as api.PlatformType,
	// 	// 	countryCode: 'GB',
	// 	// 	languageCode: 'EN',
	// 	// 	voiceLanguageType: api.VoiceLanguageType.Jpn,
	// 	// 	uniqueDeviceId: '5749021331371322',
	// 	// 	adId: 'f5c8b10e-e85f-4131-8216-7710d807f4ff',
	// 	// 	deviceInfo: {
	// 	// 		"deviceModel": "lge LG-H990DS",
	// 	// 		"operatingSystem": "Android OS 5.1.1 / API-22 (LMY48Z/rel.se.infra.20220128.171448)",
	// 	// 	},
	// 	// })
		// await session.gotApi('profile/top')
		// await session.gotApi('profile/edit', {
		// 	name: '　',
		// 	greetings: '0123456789abcdef0123456789abcdef01234567',
		// })
	// 	await session.userGetAll()
	// 	// // await session.gotApi('user/changeLanguage', {languageCodeType: api.LanguageCodeType.Ko})
	// 	// // return
	// 	// // console.dir((await session.gotApi('user/getAll')).commonResponse)
	// 	// // return
	// 	// // const firstGashaTop = stripResponse(await session.gashaTop())
	// 	// // for (const tutorialState of [11, 12, 20, 30, 31, 40, 50, 51, 52, 70, 71, 80]) {
	// 	// // 	console.dir(await session.gotApi('tutorial/progress', {
	// 	// // 		tutorialInfo: {
	// 	// // 			tutorialType: 100,
	// 	// // 			tutorialState,
	// 	// // 		}
	// 	// // 	}), {depth: null})
	// 	// 	// const gashaTop = stripResponse(await session.gashaTop())
	// 	// 	let success = false
	// 	// 	// if (!isDeepStrictEqual(gashaTop, firstGashaTop)) {
	// 	// 	// 	console.dir(gashaTop, {depth: null})
	// 	// 	// 	success = true
	// 	// 	// }
	// 	// 	try {
	// 	// 		console.dir(stripResponse(await session.gotApi('shop/top')), {depth: null})
	// 	// 		success = true
	// 	// 	} catch (e) {}
	// 	// 	// try {
	// 	// 	// 	console.dir(stripResponse(await session.gotApi('gasha/getRate', {gashaGroupId: 2})), {depth: null})
	// 	// 	// 	success = true
	// 	// 	// } catch (e) {}
	// 	// 	// if (success) {
	// 	// 	// 	// console.log(`Finished ${tutorialState}`)
	// 	// 	// 	// break
	// 	// 	// }
	// 	// // }
	// 	// // console.dir(stripResponse(await session.gashaTop()), {depth: null})
	// 	// // console.dir(await session.gotApi('shop/top'), {depth: null})
	// 	// const gashaTop = stripResponse(await session.gashaTop())
	// 	// console.log(JSON.stringify(stripResponse(gashaTop)))
	// 	// let rateList = []
	// 	// for (const gashaGroupId of gashaTop.gashaGroupList.map(group => group.gashaGroupId)) {
	// 	// 	try {
	// 	// 		const gashaRate = await session.gotApi('gasha/getRate', {
	// 	// 			// gashaIdList: [101, 202, 203, 50510],
	// 	// 			gashaGroupId,
	// 	// 		})
	// 	// 		if (gashaRate.warningMessage)
	// 	// 			console.log({gashaGroupId, warningMessage: gashaRate.warningMessage})
	// 	// 		for (const rate of gashaRate.rateList)
	// 	// 			rateList.push(rate)
	// 	// 	} catch (e) {}
	// 	// }
	// 	// console.log(JSON.stringify(rateList))
	// 	// console.log(JSON.stringify(stripResponse(await session.gotApi('gasha/getRate', {
	// 	// 	gashaIdList: [901],
	// 	// 	// gashaGroupId: 3,
	// 	// }))))
	// 	// console.log(JSON.stringify(stripResponse(await session.gotApi('clan/search', {
	// 	// 	clanName: "'",
	// 	// }))))
	// 	// console.dir(stripResponse(await session.gotApi('friend/search', {
	// 	// 	friendCode: "0' or '1'='1",
	// 	// })), {depth: null})
	// })())
	// return promises

	const db = await mysql.createPool({
		user: dbConfig.user,
		password: dbConfig.password,
		database: dbConfig.database,
		waitForConnections: true,
		connectionLimit: 10,
		queueLimit: 0,
	})

	const director = new Director(db)

	// // promises.push(keepCreatingUsers(db, servers.jp, api.OsType.Android, [api.LanguageCodeType.Ja]))
	// // promises.push(keepCreatingUsers(db, servers.jp, api.OsType.iOS, [api.LanguageCodeType.Ja]))
	// // promises.push(keepCreatingUsers(db, servers.ww, api.OsType.Android, [api.LanguageCodeType.En, api.LanguageCodeType.Ko, api.LanguageCodeType.Zh]))
	// // promises.push(keepCreatingUsers(db, servers.ww, api.OsType.iOS, [api.LanguageCodeType.En, api.LanguageCodeType.Ko, api.LanguageCodeType.Zh]))

	// // promises.push(createUser(director, db, servers.jp, api.OsType.iOS, api.LanguageCodeType.Ja, 'JPY'))

	// await resumeUsers(director, db)
	// promises.push(director.all())

	// return [promises, () => [db.end()]]
})()
