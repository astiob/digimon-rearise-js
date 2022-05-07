import * as Bourne from '@hapi/bourne'
import crypto from 'crypto'
import * as api from 'digi-rise/apitypes'
import {Server, servers} from 'digi-rise/server'
import {promises as fs} from 'fs'
import mysql from 'mysql2/promise'
import type {OkPacket, ResultSetHeader, RowDataPacket} from 'mysql2/promise'

import {db as dbConfig} from './config.json'

;(async () => {
	const conn = await mysql.createConnection({
		user: dbConfig.user,
		password: dbConfig.password,
		database: dbConfig.database,
	})

	function sql<T extends RowDataPacket[][] | RowDataPacket[] | OkPacket | OkPacket[] | ResultSetHeader>(strings: TemplateStringsArray, ...values: any[]) {
		if (!values.length)
			return conn.query<T>(strings.join())
		else
			return conn.execute<T>(strings.join('?'), values)
	}

	const [users] = await sql<mysql.RowDataPacket[]>`
		select
			last.server,
			last.user_id,
			last.uuid,
			last.language_code_type,
			last.voice_language_type,
			last.os_type,
			last.consentFormItemData,
			last.tamer_name,
			unix_timestamp(last.last_attempt) last_attempt_unix,
			-- pt.profile_top,
			uga.user_getAll
		from
			legacy_accounts last
			join legacy_accounts uga on uga.server = last.server and uga.user_id = last.user_id and uga.user_getAll is not null and uga.last_attempt = (select max(last_attempt) from legacy_accounts uga where uga.server = last.server and uga.user_id = last.user_id and uga.user_getAll is not null)
			-- left join legacy_accounts pt on pt.server = last.server and pt.user_id = last.user_id and pt.profile_top is not null and pt.last_attempt = (select max(last_attempt) from legacy_accounts pt where pt.server = last.server and pt.user_id = last.user_id and pt.profile_top is not null)
		where last.consentFormItemData is not null
		and last.last_attempt = (select max(last_attempt) from legacy_accounts where server = last.server and user_id = last.user_id and consentFormItemData is not null)
	`
	for (const user of users) {
		const officialUserId: number = user['user_id']
		const isJapan = user['server'] === 'api.digi-rise.com'
		const ourUserId = isJapan ? officialUserId : officialUserId | 0x01_00_00_00
		const userData = (JSON.parse(user['user_getAll']) as api.UserGetAll.Response).userData
		const homeDigimonList = userData.homeDigimonList
		const firstTutorialState =
		// 	userData.userEndTutorialTypeList.includes(api.TutorialType.FirstTutorial) ? api.FirstTutorialState.End
		// 	: 'userTutorial' in userData ? userData.userTutorial.tutorialType === 
			api.FirstTutorialState.End  // it's impossible to create a transfer password before first tutorial end
		const partnerDigimonId = userData.personal.partnerDigimonId
		// await sql`
		// 	insert into \`user\` (
		// 		user_id,
		// 		uuid,
		// 		language_code_type,
		// 		voice_type,
		// 		os_type,
		// 		consent_form_item_data,
		// 		tamer_name,
		// 		greetings,
		// 		first_tutorial_state,
		// 		last_user_login,
		// 		home_digimon_0,
		// 		home_digimon_1,
		// 		home_digimon_2,
		// 		home_digimon_3,
		// 		home_digimon_4,
		// 		home_digimon_5,
		// 		home_digimon_6
		// 	) values (
		// 		${ourUserId},
		// 		${user['uuid']},
		// 		${user['language_code_type']},
		// 		${user['voice_language_type'] ?? (isJapan ? api.VoiceLanguageType.Jpn : null)},
		// 		${user['os_type']},
		// 		${user['consentFormItemData'] === 'null' ? null : user['consentFormItemData']},
		// 		${user['tamer_name']},
		// 		${user['profile_top'] == null ? '' : (JSON.parse(user['profile_top']) as api.ProfileTop.Response).greetings},
		// 		${firstTutorialState},
		// 		from_unixtime(${user['last_attempt_unix']}),
		// 		${homeDigimonList[0]},
		// 		${homeDigimonList[1]},
		// 		${homeDigimonList[2]},
		// 		${homeDigimonList[3]},
		// 		${homeDigimonList[4]},
		// 		${homeDigimonList[5]},
		// 		${homeDigimonList[6]}
		// 	)
		// `
		await sql`
			update \`user\` set partner_digimon_id = ${partnerDigimonId} where user_id = ${ourUserId}
		`
	}

	conn.end()
})()
