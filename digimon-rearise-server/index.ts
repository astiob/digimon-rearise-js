import Boom from '@hapi/boom'
import * as Bourne from '@hapi/bourne'
import Hapi, {ResponseToolkit} from '@hapi/hapi'
import inert from '@hapi/inert'
import crypto from 'crypto'
import * as api from 'digi-rise/apitypes'
import {servers} from 'digi-rise/server'
import {now} from 'digi-rise/util'
import mysql from 'mysql2/promise'
import stream from 'stream'

import {db as dbConfig, encryptionKeyKey, loginEncryptionKey, masterEncryptionKey, masterRepositoryPath, resourceEncryptionKey, resourceRepositoryPath, sessionIdKey} from './config.json'
import {GetPurchaseHistoryHandler, GetShopHandler} from "./api/shop";
import {EditUserProfileHandler, GetUserProfileTopHandler} from "./api/user_profile";
import {GetGachaRateDetailHandler, GetGachaTopHandler} from "./api/gacha";
import {GetCurrentRaidsHandler} from "./api/raid";
import {GetVortexBattlesHandler, GetWeeklyTimetableHandler} from "./api/vortex";
import {GetCompletedMissionsHandler, GetCurrentMissionsHandler} from "./api/missions";
import {GetAvailableClashBattlesHandler, GetAvailableSpawnableClashBattlesHandler} from "./api/clash";
import {
	GetAllFriendsHandler, GetFullSaveDataHandler,
	SetPartnerDigimonHandler, UpdateGDPRFlagHandler,
	UpdateUserLanguageHandler,
	UpdateUserVoiceLanguageHandler
} from "./api/user";
import {
	ClaimDailyLoginBonusRequestHandler,
	GetActivityBoardDataHandler, GetHomeStatusHandler, GetHomeTimersHandler,
	SetHomeTrainingDigimonHandler
} from "./api/home";
import {GetPresentsDataHandler} from "./api/presents";
import {GetAllNewsHandler, GetNewsDetailHandler, GetSideMenuEventListHandler} from "./api/news";
import {UpdateTutorialProgressHandler} from "./api/tutorial";
import {
	GetBackupPasswordHandler,
	DoAccountRestoreHandler,
	MigrateUserHandler,
	LoginHandler,
	CreateUserHandler, GetAppStatusHandler, getSession
} from "./api/auth";
import {digiriseError, getValidCommonRequest} from "./common/digi_utils";
import {
	GetGlobalVersionAssetManifestHandler,
	GetMasterDataHandler,
	GetGlobalVersionResourceFileHandler,
	GetGlobalVersionResourceFileHandler2,
	GetJapanVersionAssetManifestHandler,
	GetGlobalVersionResourceFilePartHandler,
	GetGlobalVersionAssetManifestHandler2
} from "./api/assets";
import {WidgetHandler} from "./api/widget";
import {PrintAllDigimonsHandler} from "./api/digimon";
import {GetChallengeStatusHandler} from "./api/quests";
import {GetAllCutsceneListHandler} from "./api/story";
import {PublicPageServerHandler} from "./api/http";

declare module '@hapi/hapi' {
	interface UserCredentials {
		userId: number
	}
	interface AuthArtifacts {
		sessionId?: string
		encryptionKey: Buffer
		base64?: boolean
	}
	interface RouteOptionsPayload {
		protoAction?: 'error' | 'remove' | 'ignore'
	}
}

export const pool = mysql.createPool({
	user: dbConfig.user,
	password: dbConfig.password,
	database: dbConfig.database,
	waitForConnections: true,
	connectionLimit: 20,
	queueLimit: 0,
});

async function init() {
	const server = Hapi.server({
		port: 3000,
		host: 'localhost',
		routes: {
			files: {
				relativeTo: '/'
			},
			payload: {
				allow: 'application/octet-stream',
			},
		},
	})

	await server.register(inert)

	server.auth.scheme('digirise', (server, options) => {
		return {
			authenticate: async (request, h) => {
				const typedOptions = (options ?? {}) as {encryptionKey?: Buffer, allowSession?: boolean, base64?: boolean}
				const sessionId = request.headers['x-sid']
				if (typedOptions.allowSession !== false) {
					if (sessionId) {
						const session = await getSession(sessionId)
						if (session) {
							return h.authenticated({
								credentials: {user: {userId: session.userId}},
								artifacts: {sessionId, encryptionKey: Buffer.from(session.encryptionKey)},
							})
						}
					}
				}
				if (!sessionId && typedOptions.encryptionKey) {
					return h.authenticated({
						credentials: {},
						artifacts: {
							encryptionKey: typedOptions.encryptionKey,
							base64: typedOptions.base64 || false,
						},
					})
				}
				// console.log(`[${now()}]`, request.path, request.payload)
				throw digiriseError(api.ErrorNumber.DisconnectedSession)
			},
			payload: (request, h) => {
				const encrypted = request.payload as Buffer
				// console.log(`[${now()}]`, request.path, request.payload)
				const decipher = crypto.createDecipheriv('aes-256-cbc', request.auth.artifacts.encryptionKey, encrypted.slice(2, 18))
				const decrypted = Buffer.concat([decipher.update(encrypted.slice(20)), decipher.final()])
				const parsed = Bourne.parse(decrypted.toString('utf8'), {protoAction: request.route.settings.payload!.protoAction!})
				;(request as any).payload = parsed
				// console.log(`[${now()}]`, request.path, request.payload)
				return h.continue
			},
			options: {
				payload: true,
			},
		}
	})
	server.auth.strategy('session', 'digirise')
	server.auth.strategy('login', 'digirise', {encryptionKey: Buffer.from(loginEncryptionKey), allowSession: false})
	server.auth.strategy('loginOrSession', 'digirise', {encryptionKey: Buffer.from(loginEncryptionKey), allowSession: true})
	server.auth.strategy('master', 'digirise', {encryptionKey: Buffer.from(masterEncryptionKey), allowSession: false})
	server.auth.strategy('resource', 'digirise', {encryptionKey: Buffer.from(resourceEncryptionKey), allowSession: false, base64: true})
	server.auth.default('session')

	server.ext('onPreResponse', (req, res) => {
		const response = req.response
		if (Boom.isBoom(response)) {
			// console.error(req, response)
			if (req.path.match(/^\/api\//) && response.output.statusCode === 500) {
				response.output.statusCode = 200
				if (!('errorNumber' in response.output.payload)) {
					const error: api.Error = {errorNumber: api.ErrorNumber.ServerError}
					response.output.payload = error as unknown as Boom.Payload
				}
			}
			return res.continue
		} else if (response.variety === 'stream' || !req.auth?.artifacts?.encryptionKey || response.source === null) {
			// console.log(response.source)
			return res.continue
		} else {
			// console.log(response.source)
			const bytes = response.variety === 'buffer' ? response.source as Buffer : typeof response.source === 'object' ? Buffer.from(JSON.stringify(response.source)) : Buffer.from(String(response.source))
			const paddedCipherIv = crypto.randomBytes(20)
			const cipher = crypto.createCipheriv('aes-256-cbc', req.auth.artifacts.encryptionKey, paddedCipherIv.slice(2, 18))
			const encrypted = Buffer.concat([paddedCipherIv, cipher.update(bytes), cipher.final()])
			if (req.auth.artifacts.base64)
				// Return as a string to let Hapi apply gzip compression to counteract the Base64 expansion.
				// It will set the MIME type to text/html, but that's not a problem.
				// The official server doesn't use compression here, but again that's not a problem.
				return encrypted.toString('base64')
			else
				return encrypted
		}
	})

	server.route({
		method: 'GET',
		path: '/.well-known/{path*}',
		options: {auth: false},
		handler: {
			directory: {
				path: `${__dirname}/public/.well-known`,
			},
		}
	})

	server.route({
		method: 'GET',
		path: '/master/{language}/{cacheKey}/{hashName}',
		options: {auth: 'master', cache: false},
		handler: GetMasterDataHandler
	})

	server.route({
		method: 'GET',
		path: '/resource/{language}/{cacheKey}/asset/{osType}/7f5cb74af5d7f4b82200738fdbdc5a45',
		options: {auth: 'resource', cache: false},
		handler: GetGlobalVersionAssetManifestHandler
	})

	server.route({
		method: 'GET',
		path: '/resource/{language}/{cacheKey}/asset/{osType}/{path*}',
		options: {auth: false, cache: false},
		handler: GetGlobalVersionResourceFileHandler
	})

	server.route({
		method: 'GET',
		path: '/resource/{language}/{cacheKey}/{resourceKind}/{path*}',
		options: {auth: false, cache: false},
		handler: GetGlobalVersionResourceFileHandler2
	})

	server.route({
		method: 'GET',
		path: '/resource/ja/{cacheKey}/{resourceKind}/7f5cb74af5d7f4b82200738fdbdc5a45',
		options: {auth: 'resource', cache: false},
		handler: GetJapanVersionAssetManifestHandler
	})

	server.route({
		method: 'GET',
		path: '/resource/{language}/{cacheKey}/{resourceKind*2}/7f5cb74af5d7f4b82200738fdbdc5a45',
		options: {auth: 'resource', cache: false},
		handler: GetGlobalVersionAssetManifestHandler2
	})

	server.route({
		method: 'GET',
		path: '/resource/{language}/{cacheKey}/builtin/m.{partIndex}',
		options: {auth: false, cache: false},
		handler: GetGlobalVersionResourceFilePartHandler
	})


	server.route({
		method: 'POST',
		path: '/api/widgetInformation/get',
		options: {auth: false, payload: {allow: 'application/json'}},
		handler: WidgetHandler
	})

	server.route({
		method: 'POST',
		path: '/api/app/status',
		options: {auth: 'login'},
		handler: GetAppStatusHandler
	})

	server.route({
		method: 'POST',
		path: '/api/user/create',
		options: {auth: 'login'},
		handler: CreateUserHandler
	})

	server.route({
		method: 'POST',
		path: '/api/user/gdpr',
		options: {auth: 'login'},
		handler: UpdateGDPRFlagHandler
	})

	server.route({
		method: 'POST',
		path: '/api/migration/restorePassword',
		options: {auth: 'loginOrSession'},
		handler: DoAccountRestoreHandler
	})

	server.route({
		method: 'POST',
		path: '/api/migrate',
		options: {
			auth: false,
			payload: {
				allow: 'application/x-www-form-urlencoded',
			},
		},
		handler: MigrateUserHandler
	})

	server.route({
		method: 'POST',
		path: '/api/migration/backupPassword',
		handler: GetBackupPasswordHandler
	})

	server.route({
		method: 'POST',
		path: '/api/user/login',
		options: {auth: 'login'},
		handler: LoginHandler
	})

	server.route({
		method: 'POST',
		path: '/api/user/getAll',
		handler: GetFullSaveDataHandler
	})

	server.route({
		method: 'POST',
		path: '/api/user/changeLanguage',
		handler: UpdateUserLanguageHandler
	})

	server.route({
		method: 'POST',
		path: '/api/user/changeVoice',
		handler: UpdateUserVoiceLanguageHandler
	})

	server.route({
		method: 'POST',
		path: '/api/tutorial/progress',
		handler: UpdateTutorialProgressHandler
	})

	server.route({
		method: 'POST',
		path: '/api/home/login',
		handler: ClaimDailyLoginBonusRequestHandler
	})

	server.route({
		method: 'POST',
		path: '/api/home/statusEvery',
		handler: GetHomeStatusHandler
	})

	server.route({
		method: 'POST',
		path: '/api/home/statusIntervals',
		handler: GetHomeTimersHandler
	})

	// todo: Figure out where this goes.
	server.route({
		method: 'POST',
		path: '/api/information/getList',
		handler: GetAllNewsHandler
	})

	server.route({
		method: 'POST',
	 	path: '/api/information/getDetail',
	 	handler: GetNewsDetailHandler
	})

	server.route({
		method: 'POST',
		path: '/api/challenge/top',
		handler: GetChallengeStatusHandler
	})

	server.route({
		method: 'POST',
		path: '/api/sideMenu/getEvent',
		handler: GetSideMenuEventListHandler
	})

	server.route({
		method: 'POST',
		path: '/api/present/top',
		handler: GetPresentsDataHandler
	})

	server.route({
		method: 'POST',
		path: '/api/home/board',
		handler: GetActivityBoardDataHandler
	})

	server.route({
		method: 'POST',
		path: '/api/home/digimonEdit',
		handler: SetHomeTrainingDigimonHandler
	})

	server.route({
		method: 'POST',
		path: '/api/digimon/setPartner',
		handler: SetPartnerDigimonHandler
	})

	server.route({
		method: 'POST',
		path: '/api/friend/top',
		handler: GetAllFriendsHandler
	})

	server.route({
		method: 'POST',
		path: '/api/raid/top',
		handler: GetAvailableClashBattlesHandler
	})

	server.route({
		method: 'POST',
		path: '/api/raid/catalogTop',
		handler: GetAvailableSpawnableClashBattlesHandler
	})

	server.route({
		method: 'POST',
		path: '/api/digimon/scrounge',
		handler: PrintAllDigimonsHandler
	})

	server.route({
		method: 'POST',
		path: '/api/raidRanking/scenarioDictionary',
		handler: GetAllCutsceneListHandler
	})

	server.route({
		method: 'POST',
		path: '/api/mission/top',
		handler: GetCurrentMissionsHandler
	})

	server.route({
		method: 'POST',
		path: '/api/mission/complete',
		handler: GetCompletedMissionsHandler
	})

	server.route({
		method: 'POST',
		path: '/api/weekly/top',
		handler: GetVortexBattlesHandler
	})

	server.route({
		method: 'POST',
		path: '/api/weekly/timesInfo',
		handler: GetWeeklyTimetableHandler
	})

	server.route({
		method: 'POST',
		path: '/api/xlb/getTop',
		handler: GetCurrentRaidsHandler
	})

	server.route({
		method: 'POST',
		path: '/api/shop/top',
		handler: GetShopHandler
	})

	server.route({
		method: 'POST',
		path: '/api/gasha/top',
		handler: GetGachaTopHandler
	})

	server.route({
		method: 'POST',
		path: '/api/gasha/getRate',
		handler: GetGachaRateDetailHandler
	})

	server.route({
		method: 'POST',
		path: '/api/profile/top',
		handler: GetUserProfileTopHandler
	})

	server.route({
		method: 'POST',
		path: '/api/profile/edit',
		handler: EditUserProfileHandler
	})

	server.route({
		method: 'POST',
		path: '/api/dpoint/getPurchaseHistory',
		handler: GetPurchaseHistoryHandler
	})

	server.route({
		method: ['GET', 'POST'],
		path: '/{any*}',
		options: {auth: false},
		handler: PublicPageServerHandler
	})

	await server.start()

	console.log(`[${now()}] Server running on ${server.info.uri}`)

	// console.log(`[${now()}] DO NOT TERMINATE this server before shutting down the reverse proxy and ensuring incoming requests have ceased!`)
	// const rollingUpgrade: boolean = true
	// const [rows] = await pool.query<mysql.RowDataPacket[]>(
	// 	// `last_attempt` = max(select `last_attempt` from `legacy_accounts` where `server` = `top`.`server` and `user_id` = `top`.`user_id`)
	// 	'select `server`, `user_id`, `uuid`, `language_code_type`, `os_type`, `friend_code`, `password` from `legacy_accounts` where `consentFormItemData` is not null and `new_password` is null' +
	// 	(rollingUpgrade ? ' and `failed`' : ''),
	// )
	// for (const row of rows) {
	// 	const server = Object.values(servers).find(s => s.apiUrlBase.includes(row['server']))!
	// 	const user = {
	// 		osType: row['os_type'],
	// 		adId: uuidv4(),
	// 		userId: row['user_id'],
	// 		uuid: row['uuid'],
	// 		validationCode: '8cf07ff89c25d55d9c16f5c1c036a29e',
	// 		languageCodeType: row['language_code_type'],
	// 		delay: 2000,
	// 	}
	// 	console.log(`[${now()}] Resuming loading data for ${row['friend_code']} with password ${row['password']} and uuid ${row['uuid']}...`)
	// 	;(async () => {
	// 		try {
	// 			await loadUserData(server, user, row['friend_code'], row['password'], highPriorityDataKinds)
	// 			await loadUserData(server, user, row['friend_code'], row['password'], lowPriorityDataKinds, true)
	// 			console.log(`[${now()}] Completely loaded data for ${row['friend_code']} with password ${row['password']} and uuid ${row['uuid']}.`)
	// 		} catch (e) {
	// 			console.error(`[${now()}] Failed loading data for ${row['friend_code']} with password ${row['password']} and uuid ${row['uuid']}:`, e)
	// 		}
	// 	})()
	// }
}

process.on('unhandledRejection', (err) => {
	console.error(`[${now()}]`, err)
})

init()
