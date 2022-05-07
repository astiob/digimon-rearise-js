import mysql from 'mysql2/promise'

import * as api from './apitypes'
import {DigiriseError, DigiriseSession, User, error, hasSpecificEvolutionCode, itemCount, log, mainJpUser, run} from './client'
import {db as dbConfig} from './config.json'
import {Masters, Server, servers} from './server'
import * as t9n from './translation'

const mprIdToWatch =
	process.argv.length === 4 &&
	process.argv[2] === '--mpr' &&
	process.argv[3] === '' + +process.argv[3]! &&
	+process.argv[3] ||
	0
if (!mprIdToWatch)
	throw new Error('usage: node mpr.js --mpr ID')

async function checkMprBossHp<ConstrainedLanguageCodeType extends api.LanguageCodeType>(server: Server<ConstrainedLanguageCodeType>, user: User<ConstrainedLanguageCodeType>, mprId: number) {
	const session = await DigiriseSession.createSlim(server, user)
	const mprTop = await session.mprTop(mprId)
	const mprQuest = mprTop.mprQuestList[mprTop.mprQuestList.length - 1]
	if (mprQuest) {
		const response = mprTop._response
		const connection = await mysql.createConnection({
			user: dbConfig.user,
			password: dbConfig.password,
			database: dbConfig.database,
		})
		await connection.execute(
			'insert into `mpr_state` (`server`, `quest_id`, `timestamp`, `boss_current_hp`, `boss_total_hp`) values (?, ?, from_unixtime(?), ?, ?)',
			[
				server.apiUrlBase.match(/\/\/([^/]+)\//)![1]!,
				mprQuest.questId,
				(response.timings.upload! + response.timings.response!) / 2000,
				mprQuest.bossCurrentHp,
				mprQuest.bossTotalHp,
			],
		)
		await connection.end()
	}
}

run(() => [checkMprBossHp(servers.jp, mainJpUser, mprIdToWatch)])
