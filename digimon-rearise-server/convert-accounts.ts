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

	await sql`set time_zone = '+09:00'`

	await sql`
		insert into user_digimon (
			user_digimon_id,
			user_id,
			digimon_id,
			is_locked,
			is_ec_locked,
			bit,
			friendship_point,
			mood_value,
			skill_level,
			execution_limitbreak_id,
			complete_training_ids,
			add_friendship_point_by_period,
			last_care_time,
			last_broken_slb_necessary_level,
			awaking_level
		) select
			udl.user_digimon_id,
			uga.user_id | (case uga.server when 'api.digi-rise.com' then 0 else 16777216 end),
			udl.digimon_id,
			udl.is_locked,
			udl.is_ec_locked,
			udl.bit,
			udl.friendship_point,
			udl.mood_value,
			udl.skill_level,
			udl.execution_limitbreak_id,
			udl.complete_training_ids,
			udl.add_friendship_point_by_period,
			udl.last_care_time,
			udl.last_broken_slb_necessary_level,
			udl.awaking_level
		from
			legacy_accounts uga,
			json_table(uga.user_getAll, '$.userData.userDigimonList[*]' columns (
				user_digimon_id int path '$.userDigimonId',
				digimon_id int path '$.digimonId',
				is_locked int path '$.isLocked',
				is_ec_locked int path '$.isEcLocked',
				bit int path '$.bit',
				friendship_point int path '$.friendshipPoint',
				mood_value int path '$.moodValue',
				skill_level int path '$.skillLevel',
				execution_limitbreak_id int path '$.executionLimitbreakId',
				complete_training_ids json path '$.completeTrainingIds',
				add_friendship_point_by_period int path '$.addFriendshipPointByPeriod',
				last_care_time timestamp path '$.lastCareTime',
				last_broken_slb_necessary_level int path '$.lastBrokenSlbNecessaryLevel',
				awaking_level int path '$.awakingLevel'
			)) udl
		where uga.user_getAll is not null and uga.last_attempt = (
			select max(last_attempt)
			from legacy_accounts
			where server = uga.server
			and user_id = uga.user_id
			and user_getAll is not null
		)
	`

	await sql`
		insert into user_digimon_wearing_plugin (
			user_id,
			user_digimon_id,
			slot_id,
			user_plugin_id
		) select
			uga.user_id | (case uga.server when 'api.digi-rise.com' then 0 else 16777216 end),
			udwp.user_digimon_id,
			udwp.slot_id,
			udwp.user_plugin_id
		from
			legacy_accounts uga,
			json_table(uga.user_getAll, '$.userData.userDigimonList[*]' columns (
				user_digimon_id int path '$.userDigimonId',
				nested path '$.wearingPluginList[*]' columns (
					slot_id int path '$.slotId',
					user_plugin_id int path '$.userPluginId'
				)
			)) udwp
		where uga.user_getAll is not null and uga.last_attempt = (
			select max(last_attempt)
			from legacy_accounts
			where server = uga.server
			and user_id = uga.user_id
			and user_getAll is not null
		) and udwp.user_plugin_id >= 0
	`

	await sql`
		insert into user_item (
			user_id,
			item_id,
			count
		) select
			uga.user_id | (case uga.server when 'api.digi-rise.com' then 0 else 16777216 end),
			ui.item_id,
			ui.count
		from
			legacy_accounts uga,
			json_table(uga.user_getAll, '$.userData.userItemList[*]' columns (
				item_id int path '$.itemId',
				count int path '$.count'
			)) ui
		where uga.user_getAll is not null and uga.last_attempt = (
			select max(last_attempt)
			from legacy_accounts
			where server = uga.server
			and user_id = uga.user_id
			and user_getAll is not null
		) and ui.count > 0
	`

	conn.end()
})()
