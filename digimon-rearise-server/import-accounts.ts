import * as Bourne from '@hapi/bourne'
import crypto from 'crypto'
import * as api from 'digi-rise/apitypes'
import {Server, servers} from 'digi-rise/server'
import {promises as fs} from 'fs'
import mysql from 'mysql2/promise'

import {db as dbConfig} from './config.json'

;(async () => {
	const conn = await mysql.createConnection({
		user: dbConfig.user,
		password: dbConfig.password,
		database: dbConfig.database,
	})

	async function importDirectory(path: string, server: Server<any>) {
		for (const fileName of await fs.readdir(path)) {
			const match = fileName.match(/^([0-9]{9})\.json$/)
			if (!match || !match[1]) {
				if (fileName !== 'jp')
					console.error(fileName)
				continue
			}
			const friendCode = match[1]
			const filePath = `${path}/${fileName}`
			const data: { userData: api.UserData, pass: string } = Bourne.parse(await fs.readFile(filePath, {encoding: 'utf8'}))
			const mtime = Number((await fs.stat(filePath, {bigint: true})).mtimeMs / 1000n)
			const [[row]] = await conn.execute<mysql.RowDataPacket[]>(
				'select `user_id`, `new_password`, `user_getAll`, unix_timestamp(`last_attempt`) `last_attempt` from `legacy_accounts` where `server` = ? and `friend_code` = ? and `password` = ? and `consentFormItemData` is not null',
				[
					server.apiUrlBase.match(/\/\/([^/]+)\//)![1]!,
					friendCode,
					data.pass,
				],
			)
			if (row) {
				if (row['user_id'] !== data.userData.personal.userId)
					console.error(`Error: user ID mismatch for ${filePath}: file has ${data.userData.personal.userId} but DB has ${row['user_id']}!`)
				if (row['user_getAll'] == null)
					console.error(`Error: ${filePath} is in DB but has null user_getAll!`)
				if (row['last_attempt'] < mtime || row['last_attempt'] === mtime && row['new_password'] !== data.pass)
					console.error(`Error: file ${filePath} is newer than the DB entry that uses its password!`)
				continue
			}
			let [rows] = await conn.execute<mysql.RowDataPacket[]>(
				'select `user_id` from `legacy_accounts` where `server` = ? and `friend_code` = ? and `consentFormItemData` is not null and `last_attempt` >= from_unixtime(?)',
				[
					server.apiUrlBase.match(/\/\/([^/]+)\//)![1]!,
					friendCode,
					mtime,
				],
			)
			if (rows.length) {
				console.log(`Skipping ${filePath} because a newer DB entry exists.`)
				if (rows.some(row => row['user_id'] !== data.userData.personal.userId))
					console.error(`Error: one of those entries has a different user ID!`)
				continue
			}
			[rows] = await conn.execute<mysql.RowDataPacket[]>(
				'select `user_id` from `legacy_accounts` where `server` = ? and `friend_code` = ? and `consentFormItemData` is not null and `last_attempt` < from_unixtime(?)',
				[
					server.apiUrlBase.match(/\/\/([^/]+)\//)![1]!,
					friendCode,
					mtime,
				],
			)
			if (rows.length) {
				console.warn(`Warning: ${filePath} is newer than some matching DB entries.`)
				if (rows.some(row => row['user_id'] !== data.userData.personal.userId))
					console.error(`Error: one of those entries has a different user ID!`)
				continue
			}
			await conn.execute(
				'replace into `legacy_accounts` (`server`, `user_id`, `uuid`, `friend_code`, `password`, `new_password`, `language_code_type`, `os_type`, `tamer_name`, `consentFormItemData`, `user_getAll`, `first_attempt`, `last_attempt`) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, from_unixtime(?), from_unixtime(?))',
				[
					server.apiUrlBase.match(/\/\/([^/]+)\//)![1]!,
					data.userData.personal.userId,
					crypto.randomBytes(16).toString('hex'),
					friendCode,
					data.pass,
					data.pass,
					server === servers.jp ? api.LanguageCodeType.Ja : api.LanguageCodeType.En,  // one JP user got imported with En
					api.OsType.iOS,
					data.userData.personal.name,
					server === servers.jp ? 'null' : '[{"itemType":1,"isAccepted":false,"version":1},{"itemType":2,"isAccepted":false,"version":1}]',
					JSON.stringify({userData: data.userData} as api.UserGetAll.Response),
					mtime,
					mtime,
				],
			)
			console.log(`Imported ${filePath}.`)
		}
	}

	await importDirectory('accounts', servers.ww)
	await importDirectory('accounts/jp', servers.jp)

	conn.end()
})()
