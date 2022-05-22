import {Request, ResponseToolkit} from '@hapi/hapi'
import * as api from '../../digimon-rearise-bots/apitypes'
import crypto from "crypto";
import {v4 as uuidv4} from "uuid";
import mysql from "mysql2/promise";
import {Server, servers} from "../../digimon-rearise-bots/server";
import {now} from "../../digimon-rearise-bots/util";
import {TamerLevelMaster, TextMaster} from "../../digimon-rearise-bots/master";
import {digiriseError, getValidCommonRequest} from "../common/digi_utils";
import * as client from "../../digimon-rearise-bots/client";
import {DigiriseSession, stripResponse} from "../../digimon-rearise-bots/client";
import {shuffleInPlace} from "../common/utils";
import {baseUrl, isCustomBaseUrl, officialBaseUrl} from "../common/config";
import NodeGit from "nodegit";
import {db as dbConfig, encryptionKeyKey, loginEncryptionKey, masterEncryptionKey, masterRepositoryPath, resourceEncryptionKey, resourceRepositoryPath, sessionIdKey} from '../config.json'
import {getMasters, masterBranchNamesByCodeType, masterRepository, resourceCacheKey} from "./assets";
import {pool} from "../index";

// User Migration
let webMigrationPromises = new Map<string, Promise<unknown>>()
const highPriorityDataKinds: [string, (session: DigiriseSession<any>) => unknown][] = [
    ['user_getAll', async session => stripResponse(await session.gotApi('user/getAll'))],
    ['home_statusEvery', async session => stripResponse(await session.gotApi('home/statusEvery'))],
    ['profile_top', async session => stripResponse(await session.gotApi('profile/top'))],
]
const lowPriorityDataKinds: [string, (session: DigiriseSession<any>) => unknown][] = shuffleInPlace([
    ['challenge_top', async session => stripResponse(await session.gotApi('challenge/top'))],
    ['mission_top', async session => stripResponse(await session.gotApi('mission/top'))],
    ['present_top', async session => stripResponse(await session.gotApi('present/top'))],
    ['userRaidCatalogList', async session => (await session.gotApi('raid/top')).userRaidCatalogList ?? null],
    ['weekly_top', async session => stripResponse(await session.gotApi('weekly/top'))],
    ['shop_top', async session => stripResponse(await session.gotApi('shop/top'))],
    ['friend_top', async session => stripResponse(await session.gotApi('friend/top'))],
    ['clan_top', async session => stripResponse(await session.gotApi('clan/top'))],
    ['dpoint_getPurchaseHistory', async session => stripResponse(await session.gotApi('dpoint/getPurchaseHistory'))],
    ['bp2_top', async session => {
        try {
            return stripResponse(await session.gotApi('bp2/top', {}, {maxAttempts: 1}))
        } catch (e) {
            if (e instanceof client.DigiriseError && e.errorNumber === api.ErrorNumber.ServerError)
                return null
            throw e
        }
    }],
])
// bp2/trend
// raid/catalogTop
// raidRanking/scenarioDictionary
// raid/getEventReward
// raid/getDetailRewards (lists drops)
// raidRanking/top (lists periods & text labels)
// raidRanking/reward (lists ranking rewards)
// raidRanking/userRanking (lists ranked users)
// raidevent state, rewards
// raidevent history

async function migrationRestorePassword(userAgent: string | undefined, commonRequest: api.CommonRequest, payload: api.WithCommonRequest<api.MigrationRestorePassword.Request>, backgroundPromises?: Map<string, Promise<unknown>>): Promise<api.MigrationRestorePassword.Response> { // try {
    if (typeof payload.uuid !== 'string' || !payload.uuid.match(/^[0-9a-f]{32}$/))
        throw new Error('invalid `uuid`')
    if (typeof payload.friendCode !== 'string' || !payload.friendCode.match(/^[\x21-\x7E]{9}$/))
        throw new Error('invalid `friendCode`')
    if (typeof payload.password !== 'string' || !payload.password.match(/^[\x21-\x7E]{1,30}$/))
        throw new Error('invalid `password`')
    const isJapan = !('languageCodeType' in commonRequest)

    function isGlobalPayload(payload: api.MigrationRestorePassword.Request): payload is api.MigrationRestorePassword.GlobalRequest {
        return !isJapan
    }

    let voiceLanguageType = api.VoiceLanguageType.Jpn
    if (isGlobalPayload(payload)) {
        if (payload.voiceLanguageType !== api.VoiceLanguageType.En && payload.voiceLanguageType !== api.VoiceLanguageType.Jpn)
            throw new Error('invalid `voiceLanguageType`')
        voiceLanguageType = payload.voiceLanguageType
    }
    payload = {...payload}
    let originalPassword = payload.password
    const server = isJapan ? servers.jp : servers.ww
    const user = {
        osType: commonRequest.osType,
        adId: payload.adId,
        userId: 0,
        uuid: payload.uuid,
        validationCode: '8cf07ff89c25d55d9c16f5c1c036a29e',
        languageCodeType: commonRequest.languageCodeType ?? api.LanguageCodeType.Ja,
        deviceInfo: payload.deviceInfo,
        userAgent: userAgent,
        delay: 0,
    }
    let [[saved]] = await pool.execute<mysql.RowDataPacket[]>(
        'select * from `legacy_accounts` where `server` = ? and `friend_code` = ? and (`password` = ? or `new_password` = ?)',
        [
            server.apiUrlBase.match(/\/\/([^/]+)\//)![1]!,
            payload.friendCode,
            originalPassword,
            originalPassword,
        ],
    )
    let restored: Omit<api.MigrationRestorePassword.Response, 'tamerLevel' | 'sessionId' | 'encryptionKey'> & Partial<Pick<api.MigrationRestorePassword.Response, 'tamerLevel' | 'sessionId' | 'encryptionKey'>>
    if (saved && saved['consentFormItemData'] != null) {
        if (originalPassword !== saved['password']) {
            if (originalPassword !== saved['new_password'])
                throw new Error
            originalPassword = saved['password']
        }
        user.userId = saved['user_id']
        restored = {
            userId: saved['user_id'],
            friendCode: saved['friend_code'],
            tamerName: saved['tamer_name'],
        }
        const consentFormItemData = JSON.parse(saved['consentFormItemData'])
        if (consentFormItemData)
            restored.consentFormItemData = consentFormItemData
        if (!backgroundPromises && saved['new_password'] != null) {
            const ourUserId = isJapan ? user.userId : user.userId | 0x01_00_00_00
            const [[currentUuid]] = await pool.execute<mysql.RowDataPacket[]>(
                'select `uuid` from `user` where `user_id` = ?',
                [
                    ourUserId,
                ],
            )
            if (currentUuid!['uuid'] !== user.uuid) {
                await pool.execute(
                    'update `user` set `uuid` = ?, `language_code_type` = ?, `voice_type` = ?, `os_type` = ? where `user_id` = ?',
                    [
                        user.uuid,
                        user.languageCodeType,
                        voiceLanguageType,
                        user.osType,
                        ourUserId,
                    ]
                )
            }
        }
    } else {
        throw digiriseError(api.ErrorNumber.UserInheritance)
        // const session = await DigiriseSession.createSlim<any>(server, user, {verbose: false})
        // let targetUserId = saved ? saved['user_id'] : 0
        // if (!saved) {
        // 	const searchSession = await DigiriseSession.createSlim<any>(server, isJapan ? mainJpUser : searchGlobalUser, {verbose: false})
        // 	let tamerName = null
        // 	try {
        // 		({userId: targetUserId, tamerName} = (await searchSession.gotApi<api.FriendSearch.Response>('friend/search', {
        // 			friendCode: payload.friendCode,
        // 		})).friendInfo)
        // 	} catch (e) {
        // 		if (!(e instanceof client.DigiriseError))
        // 			throw e
        // 		console.error(`[${now()}] Failed friend/search:`, e)
        // 	}
        // 	await pool.execute(
        // 		'insert into `legacy_accounts` (`server`, `user_id`, `uuid`, `friend_code`, `password`, `language_code_type`, `voice_language_type`, `os_type`, `tamer_name`) values (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        // 		[
        // 			server.apiUrlBase.match(/\/\/([^/]+)\//)![1]!,
        // 			targetUserId,
        // 			user.uuid,
        // 			payload.friendCode,
        // 			originalPassword,
        // 			user.languageCodeType,
        // 			voiceLanguageType,
        // 			user.osType,
        // 			tamerName,
        // 		],
        // 	)
        // }
        // let inTransaction = false
        // const conn = await pool.getConnection()
        // try {
        // 	await conn.beginTransaction()
        // 	inTransaction = true
        // 	;[[saved]] = await conn.execute<mysql.RowDataPacket[]>(
        // 		'select * from `legacy_accounts` where `server` = ? and `friend_code` = ? and `password` = ? for update',
        // 		[
        // 			server.apiUrlBase.match(/\/\/([^/]+)\//)![1]!,
        // 			payload.friendCode,
        // 			originalPassword,
        // 		],
        // 	)
        // 	if (!saved)
        // 		throw new Error
        // 	if (saved['consentFormItemData'] != null) {  // race won by other request
        // 		user.userId = saved['user_id']
        // 		restored = {
        // 			userId: saved['user_id'],
        // 			friendCode: saved['friend_code'],
        // 			tamerName: saved['tamer_name'],
        // 		}
        // 		const consentFormItemData = JSON.parse(saved['consentFormItemData'])
        // 		if (consentFormItemData)
        // 			restored.consentFormItemData = consentFormItemData
        // 	} else {
        // 		for (let i = 1, maxAttempts = 10; ; i++) {
        // 			const response = await session.migrationRestorePasswordRaw(payload)
        // 			if ('errorNumber' in response) {
        // 				if (response.errorNumber === api.ErrorNumber.UserInheritance && targetUserId) {
        // 					// user.userId = targetUserId
        // 					// try {
        // 					// 	await DigiriseSession.createSlim<any>(server, user, {verbose: false})
        // 					// } catch (e) {
        // 					// 	if (!(e instanceof client.DigiriseError) || e.errorNumber !== api.ErrorNumber.UserNotExists)
        // 					// 		throw e
        // 					// 	throw digiriseError(response.errorNumber)
        // 					// }
        // 					// restored = {
        // 					// 	userId: saved['user_id'],
        // 					// 	friendCode: saved['friend_code'],
        // 					// 	tamerName: saved['tamer_name'],
        // 					// }
        // 					// if (!isJapan)
        // 					// 	restored.consentFormItemData = [
        // 					// 		{isAccepted: false, itemType: 1, version: 0},
        // 					// 		{isAccepted: false, itemType: 2, version: 0},
        // 					// 	]
        // 					// await conn.query("update `legacy_accounts` set `consentFormItemData` = 'null' where ...")
        // 					try {
        // 						if (i === maxAttempts) {
        // 							throw digiriseError(response.errorNumber)
        // 						} else {
        // 							user.userId = targetUserId
        // 							const session = await DigiriseSession.createSlim<any>(server, user, {verbose: false})
        // 							payload.password = (await session.gotApi('migration/backupPassword')).password
        // 							continue
        // 						}
        // 					} catch (e) {
        // 						if (e instanceof client.DigiriseError && e.errorNumber === api.ErrorNumber.UserNotExists)
        // 							throw digiriseError(response.errorNumber)
        // 						console.error(`[${now()}] Failed salvageable migration/restorePassword for friend code ${payload.friendCode} with password ${originalPassword} and uuid ${payload.uuid}:`, e)
        // 						throw e
        // 					}
        // 				} else {
        // 					throw digiriseError(response.errorNumber)
        // 				}
        // 			} else {
        // 				restored = response
        // 				// Note: user.userId got updated by migrationRestorePasswordRaw
        // 				await conn.execute(
        // 					'update `legacy_accounts` set `user_id` = ?, `tamer_name` = ?, `consentFormItemData` = ? where `server` = ? and `friend_code` = ? and `password` = ?',
        // 					[
        // 						restored.userId,
        // 						restored.tamerName,
        // 						JSON.stringify(restored.consentFormItemData ?? null),
        // 						server.apiUrlBase.match(/\/\/([^/]+)\//)![1]!,
        // 						payload.friendCode,
        // 						originalPassword,
        // 					]
        // 				)
        // 				saved['user_id'] = restored.userId
        // 				saved['tamer_name'] = restored.tamerName
        // 				saved['consentFormItemData'] = JSON.stringify(restored.consentFormItemData ?? null)
        // 				break
        // 			}
        // 		}
        // 	}
        // 	inTransaction = false
        // 	await conn.commit()
        // } catch (e) {
        // 	if (inTransaction)
        // 		await conn.rollback()
        // 	throw e
        // } finally {
        // 	conn.release()
        // }
    }
    const bgKey = `${isJapan ? 'jp' : 'ww'}:${payload.friendCode}:${originalPassword}`
    if (backgroundPromises) {
        const backgroundPromise = backgroundPromises.get(bgKey)
        if (backgroundPromise) {
            try {
                await backgroundPromise
            } catch (e) {
            }
            [[saved]] = await pool.execute<mysql.RowDataPacket[]>(
                'select * from `legacy_accounts` where `server` = ? and `friend_code` = ? and `password` = ?',
                [
                    server.apiUrlBase.match(/\/\/([^/]+)\//)![1]!,
                    payload.friendCode,
                    originalPassword,
                ],
            )
            if (!saved)
                throw new Error
        }
    }
    if (saved['new_password'] == null) {
        // try {
        await loadUserData(server, user, payload.friendCode, originalPassword, highPriorityDataKinds)
        // } catch (e) {
        // 	if (!(e instanceof client.DigiriseError) || e.errorNumber !== api.ErrorNumber.UserNotExists)
        // 		throw e
        // }
        user.delay = 2000
        const backgroundPromise = loadUserData(server, user, payload.friendCode, originalPassword, lowPriorityDataKinds, true).then(
            _ => console.log(`[${now()}] Completely loaded low priority data for ${payload.friendCode} with password ${originalPassword} and uuid ${payload.uuid}.`),
            async e => {
                console.error(`[${now()}] Failed loading low priority data for ${payload.friendCode} with password ${originalPassword} and uuid ${payload.uuid}:`, e)
                await pool.execute(
                    'update `legacy_accounts` set `failed` = 1 where `server` = ? and `friend_code` = ? and `password` = ?',
                    [
                        server.apiUrlBase.match(/\/\/([^/]+)\//)![1]!,
                        payload.friendCode,
                        originalPassword,
                    ]
                )
            },
        )
        if (backgroundPromises)
            backgroundPromises.set(bgKey, backgroundPromise.finally(() => backgroundPromises.delete(bgKey)))
    }
    let tamerLevel = restored.tamerLevel
    if (tamerLevel === undefined) {
        [[saved]] = await pool.execute<mysql.RowDataPacket[]>(
            'select * from `legacy_accounts` where `server` = ? and `friend_code` = ? and `password` = ?',
            [
                server.apiUrlBase.match(/\/\/([^/]+)\//)![1]!,
                payload.friendCode,
                originalPassword,
            ],
        )
        if (!saved)
            throw new Error
        const personal: api.UserPersonal = JSON.parse(saved['user_getAll']).userData.personal
        if ('level' in personal)
            tamerLevel = personal.level
        else {
            const language = commonRequest.languageCodeType ?? api.LanguageCodeType.Ja
            const masters = (await getMasters(language))!
            const blob = await masters.tree.entryByName('mst_tamer_level.json').getBlob()
            const tamerLevelMaster = new TamerLevelMaster(JSON.parse(blob.toString()))
            tamerLevel = [...tamerLevelMaster.values()].sort((a, b) => b.level - a.level).find(tl => personal.exp >= tl.totalExp)!.level
        }
    }
    const ourUserId = isJapan ? user.userId : user.userId | 0x01_00_00_00
    const newSession = (await createSession(ourUserId, user.uuid, false))!
    return {
        ...restored,
        tamerLevel,
        userId: ourUserId,
        sessionId: newSession.sessionId,
        encryptionKey: newSession.encryptionKey,
    }
} //catch (e) { console.error(`[${now()}] Failed migration/restorePassword for ${payload.friendCode} with password ${originalPassword} and uuid ${payload.uuid}:`, e); throw e } }

async function loadUserData(server: Server<any>, user: client.User<any>, friendCode: string, originalPassword: string, dataKinds: [string, (session: DigiriseSession<any>) => unknown][], transferBack: boolean = false) {
    let saved, session
    for (const [name, retrieve] of dataKinds) {
        if (!saved) {
            ;[[saved]] = await pool.execute<mysql.RowDataPacket[]>(
                'select * from `legacy_accounts` where `server` = ? and `friend_code` = ? and `password` = ?',
                [
                    server.apiUrlBase.match(/\/\/([^/]+)\//)![1]!,
                    friendCode,
                    originalPassword,
                ],
            )
            if (!saved)  // shouldn't happen, but if it does, just abort
                return
        }
        if (saved[name])
            continue
        if (!session)
            session = await DigiriseSession.createSlim<any>(server, user, {verbose: false})
        const stringifiedValue = JSON.stringify(await retrieve(session))
        await pool.execute(
            'update `legacy_accounts` set `' + name + '` = ? where `server` = ? and `friend_code` = ? and `password` = ?',
            [
                stringifiedValue,
                server.apiUrlBase.match(/\/\/([^/]+)\//)![1]!,
                friendCode,
                originalPassword,
            ],
        )
        // The upstream call took some time. If the user is impatient,
        // they may have fired off another migration in the meantime.
        // Try to avoid duplicating the work.
        saved = undefined
    }
    if (transferBack) {
        if (!session)
            session = await DigiriseSession.createSlim<any>(server, user, {verbose: false})

        if (!saved) {
            ;[[saved]] = await pool.execute<mysql.RowDataPacket[]>(
                'select * from `legacy_accounts` where `server` = ? and `friend_code` = ? and `password` = ?',
                [
                    server.apiUrlBase.match(/\/\/([^/]+)\//)![1]!,
                    friendCode,
                    originalPassword,
                ],
            )
            if (!saved)  // shouldn't happen, but if it does, just abort
                return
        }
        if (!saved['raid_getEventTop']) {
            const savedHomeStatusEvery: api.HomeStatusEvery.Response = JSON.parse(saved['home_statusEvery'])
            const [event] = savedHomeStatusEvery.raidEventInSessionList
            let stringifiedValue = null
            if (event) {
                const value = await session.gotApi('raid/getEventTop', {eventId: event.eventId})
                stringifiedValue = JSON.stringify(stripResponse(value))
            }
            await pool.execute(
                'update `legacy_accounts` set `raid_getEventTop` = ? where `server` = ? and `friend_code` = ? and `password` = ?',
                [
                    stringifiedValue,
                    server.apiUrlBase.match(/\/\/([^/]+)\//)![1]!,
                    friendCode,
                    originalPassword,
                ],
            )
        }

        const raidRankingList = shuffleInPlace((await session.gotApi<api.RaidRankingScenarioDictionary.Response>('raidRanking/scenarioDictionary')).dictionaryList)
        // This may be a newer transfer of the same user, so overwrite
        // let savedRecords: undefined | mysql.RowDataPacket[]
        for (const event of raidRankingList) {
            shuffleInPlace(event.periodList)
            for (const period of event.periodList) {
                // if (!savedRecords) {
                // 	[savedRecords] = await pool.execute<mysql.RowDataPacket[]>(
                // 		'select `event_id`, `period_id` from `legacy_raid_ranking_record` where `server` = ? and `user_id` = ?',
                // 		[
                // 			server.apiUrlBase.match(/\/\/([^/]+)\//)![1]!,
                // 			user.userId,
                // 		],
                // 	)
                // }
                // if (savedRecords.some(sr => sr['event_id'] === event.eventId && sr['period_id'] === period.periodId))
                // 	continue
                const value = await session.gotApi('raidRanking/record', {
                    eventId: event.eventId,
                    periodId: period.periodId,
                })
                const stringifiedValue = JSON.stringify(stripResponse(value))
                await pool.execute(
                    'replace into `legacy_raid_ranking_record` (`server`, `user_id`, `event_id`, `period_id`, `response`) values (?, ?, ?, ?, ?)',
                    [
                        server.apiUrlBase.match(/\/\/([^/]+)\//)![1]!,
                        user.userId,
                        event.eventId,
                        period.periodId,
                        stringifiedValue,
                    ],
                )
                // savedRecords = undefined
            }
        }

        let inTransaction = false
        const conn = await pool.getConnection()
        try {
            await conn.beginTransaction()
            inTransaction = true
            ;[[saved]] = await conn.execute<mysql.RowDataPacket[]>(
                'select * from `legacy_accounts` where `server` = ? and `friend_code` = ? and `password` = ? and `new_password` is null for update',
                [
                    server.apiUrlBase.match(/\/\/([^/]+)\//)![1]!,
                    friendCode,
                    originalPassword,
                ],
            )
            if (saved) {
                const newPassword = (await session.gotApi('migration/backupPassword')).password
                await conn.execute('update `legacy_accounts` set `new_password` = ? where `server` = ? and `friend_code` = ? and `password` = ?',
                    [
                        newPassword,
                        server.apiUrlBase.match(/\/\/([^/]+)\//)![1]!,
                        friendCode,
                        originalPassword,
                    ],
                )
            }
            inTransaction = false
            await conn.commit()
        } catch (e) {
            if (inTransaction)
                await conn.rollback()
            throw e
        } finally {
            conn.release()
        }
    }
}

export async function MigrateUserHandler(req: Request, res: ResponseToolkit): Promise<string> {
    try {
        if (typeof req.payload !== 'object') {
            console.dir(req.payload, {depth: null})
            throw new Error
        }
        const formPayload = req.payload as Record<string, unknown>
        if (formPayload['server'] !== 'jp' && formPayload['server'] !== 'ww')
            throw new Error('invalid `server`')
        const platformTypeString = formPayload['platformType']
        if (platformTypeString !== '' + api.PlatformType.AppStore && platformTypeString !== '' + api.PlatformType.PlayStore)
            throw new Error('invalid `platformType`')
        const platformType = +platformTypeString as api.PlatformType
        const commonRequest: api.CommonRequest = {
            osType: platformType as number as api.OsType,
            version: {
                appVersion: '99.9.0',
                masterVersion: '',
                resourceVersion: '',
            },
        }
        let payload: api.WithCommonRequest<api.MigrationRestorePassword.Request> = {
            commonRequest,
            friendCode: formPayload['friendCode'] as string,
            password: formPayload['password'] as string,
            uuid: crypto.randomBytes(16).toString('hex'),
            platformType: platformType,
            uniqueDeviceId: Math.floor(Math.random() * 9000000000000000) + 1000000000000000 + '',
            adId: uuidv4(),
            deviceInfo: {
                operatingSystem: 'Android OS 5.1.1 / API-22 (LMY48Z/eng.se.infra.20190315.173723)',
                deviceModel: 'OnePlus A5010',
            },
        }
        if (formPayload['server'] === 'ww') {
            commonRequest.languageCodeType = api.LanguageCodeType.En
            payload = {
                ...payload,
                countryCode: 'GB',
                languageCode: 'EN',
                voiceLanguageType: api.VoiceLanguageType.Jpn,
            }
        }
        let response
        try {
            response = await migrationRestorePassword(undefined, commonRequest, payload, webMigrationPromises)
        } catch (e) {
            if ((e as any)?.errorNumber === api.ErrorNumber.UserInheritance || (e as Error)?.message?.match(/^invalid /)) {
                return `<!DOCTYPE html>
<html lang=en>
<meta charset=utf-8>
<meta name=flattr:id content=x7ng60>
<title>Wrong Digimon ReArise password</title>
<p>Your friend code or password was incorrect. <a href=/ onclick="history.back(); return false">Go back</a> and check and retype your friend code and password.</p>`
            }
            throw e
        }
        const promiseKey = `${formPayload['server']}:${payload.friendCode}:${payload.password}`
        let newPassword: string | null = null
        if (!webMigrationPromises.has(promiseKey)) {
            const [[saved]] = await pool.execute<mysql.RowDataPacket[]>(
                'select `new_password` from `legacy_accounts` where `server` = ? and `friend_code` = ? and `password` = ?',
                [
                    servers[formPayload['server']].apiUrlBase.match(/\/\/([^/]+)\//)![1]!,
                    payload.friendCode,
                    payload.password,
                ],
            )
            if (!saved)
                throw new Error
            newPassword = saved['new_password']
            if (newPassword === null)
                console.error(`[${now()}] Got null new_password after promise gone for friend code ${payload.friendCode} with password ${payload.password}`)
        }

        function escapeHtml(unsafe: string) {
            return unsafe.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
        }

        return `<!DOCTYPE html>
<html lang=en>
<meta charset=utf-8>
<meta name=flattr:id content=x7ng60>
<title>Saved Digimon ReArise account</title>
<style>
dl { display: table }
div { display: table-row }
dt, dd { display: table-cell }
dt { padding-right: 1ex }
</style>
<h2>Success!</h2>${
            newPassword == null ? `
<p>Your account’s main data has been saved. Additional data is currently being saved. Reload this page (resubmit the form) in three minutes to check get a transfer password usable in the official app.</p>
<dl>
<div><dt>Friend code (ID):<dd>${escapeHtml(payload.friendCode)}</dd></div>
<div><dt>Password:<dd>${escapeHtml(payload.password)}</dd></div>
<div><dt>Tamer name:<dd>${escapeHtml(response.tamerName)}</dd></div>
<div><dt>Tamer level:<dd>${escapeHtml('' + response.tamerLevel)}</dd></div>
</dl>`
                : `
<p>Your account’s data has been saved. A new transfer password has been generated for you:</p>
<dl>
<div><dt>Friend code (ID):<dd>${escapeHtml(payload.friendCode)}</dd></div>
<div><dt>Password:<dd>${escapeHtml(newPassword)}</dd></div>
<div><dt>Tamer name:<dd>${escapeHtml(response.tamerName)}</dd></div>
<div><dt>Tamer level:<dd>${escapeHtml('' + response.tamerLevel)}</dd></div>
</dl>
<p><strong>When you install the private server’s app, can use this friend code & password to transfer this account onto your phone/tablet.</strong></p>
<p>If you wish, you can also use this friend code & password to transfer your official account back into the official app.</p>`
        }`
    } catch (e) {
        console.error(`[${now()}] Failed web migration:`, e);
        throw e
    }
}

export async function DoAccountRestoreHandler (req: Request, res: ResponseToolkit): Promise<api.MigrationRestorePassword.Response> {
    const commonRequest = await getValidCommonRequest(req, false)
    const payload = req.payload as api.WithCommonRequest<api.MigrationRestorePassword.Request>
    return migrationRestorePassword(req.headers['user-agent'], commonRequest, payload)
}

export async function GetBackupPasswordHandler (req: Request, res: ResponseToolkit): Promise<api.MigrationBackupPassword.Response> {
    const commonRequest = await getValidCommonRequest(req)
    const userId = req.auth.credentials.user!.userId
    const [serverName, serverUserId] =
        !('languageCodeType' in commonRequest)
            ? [servers.jp.apiUrlBase.match(/\/\/([^/]+)\//)![1]!, userId]
            : [servers.ww.apiUrlBase.match(/\/\/([^/]+)\//)![1]!, userId ^ 0x01_00_00_00]
    const [[saved]] = await pool.execute<mysql.RowDataPacket[]>(
        'select `new_password` from `legacy_accounts` where `server` = ? and `user_id` = ? and `consentFormItemData` is not null order by `last_attempt` desc limit 1',
        [
            serverName,
            serverUserId,
        ],
    )
    if (!saved)
        throw new Error
    const newPassword: string | null = saved['new_password']
    return {
        password: newPassword ?? '(try later)'
    }
}

// Actual Authentication
async function createUser(pool: mysql.Pool, commonRequest: api.CommonRequest, payload: api.UserCreate.Request, voiceType: api.VoiceLanguageType) {
    const language = commonRequest.languageCodeType ?? api.LanguageCodeType.Ja
    const masters = (await getMasters(language))!
    const blob = await masters.tree.entryByName('mst_text.json').getBlob()
    const textMaster = new TextMaster(JSON.parse(blob.toString()))
    const [result] = await pool.execute<mysql.OkPacket | mysql.ResultSetHeader>(
        'insert into `user` (`uuid`, `language_code_type`, `voice_type`, `os_type`, `consent_form_item_data`, `tamer_name`, `greetings`, `first_tutorial_state`) values (?, ?, ?, ?, ?, ?, ?, ?)',
        [
            payload.uuid,
            language,
            voiceType,
            commonRequest.osType,
            'consentFormItemData' in payload ? JSON.stringify(payload.consentFormItemData) : null,
            payload.name,
            textMaster.get(1558)!.text,
            api.FirstTutorialState.Prologue,
        ],
    )
    return {
        userId: result.insertId,
        friendCode: '000000000',
    }
}

export async function CreateUserHandler (req: Request, res: ResponseToolkit): Promise<api.WithCommonResponse<api.UserCreate.Response>> {
    try {
        // handler: async (request, h): Promise<api.UserCreate.Response> => {
        const commonRequest = await getValidCommonRequest(req, false)

        const payload = req.payload as api.UserCreate.Request
        function isJapan(payload: api.UserCreate.Request): payload is api.UserCreate.JapanRequest {
            return !('languageCodeType' in commonRequest)
        }
        let voiceType
        if (typeof payload.uuid !== 'string' || !payload.uuid.match(/^[0-9a-f]{32}$/))
            throw new Error('invalid `uuid`')
        if (typeof payload.name !== 'string')
            throw new Error('invalid `name`')
        if (payload.platformType !== api.PlatformType.AppStore && payload.platformType !== api.PlatformType.PlayStore)
            throw new Error('invalid `platformType`')
        if (isJapan(payload)) {
            if (payload.currencyUnit !== 'JPY')
                throw new Error('invalid `currencyUnit`')
            voiceType = api.VoiceLanguageType.Jpn
        } else {
            if (payload.voiceType !== api.VoiceLanguageType.En && payload.voiceType !== api.VoiceLanguageType.Jpn)
                throw new Error('invalid `voiceType`')
            if (typeof payload.consentFormItemData !== 'object' || !(payload.consentFormItemData instanceof Array))
                throw new Error('invalid `consentFormItemData`')
            voiceType = payload.voiceType
        }

        if (!payload.name.length || payload.name.length > 10)
            throw digiriseError(api.ErrorNumber.UserNameCharacterOver)
        if (payload.name.match(/^\s+$/))
            throw digiriseError(api.ErrorNumber.NGWordInUserName)

        const user = await createUser(pool, commonRequest, payload, voiceType)
        const newSession = (await createSession(user.userId, payload.uuid, true))!
        return {
            userId: user.userId,
            friendCode: user.friendCode,
//				sessionId: '00000000000000000000000000000000',
//				encryptionKey: '00000000000000000000000000000000',
            sessionId: newSession.sessionId,
            encryptionKey: newSession.encryptionKey,
            commonResponse: {
                clearMissionIdList: [],
                clearChallengeIdList: [],
                tutorialInfo: {
                    tutorialType: api.TutorialType.FirstTutorial,
                    tutorialState: api.FirstTutorialState.Prologue,
                },
            },
        }
    } catch (e) { console.error(`[${now()}]`, req.path, req.payload, e); throw e }
}

async function masterCacheKey(language: api.LanguageCodeType): Promise<string> {
    const repo = await masterRepository
    const commit = await repo.getBranchCommit(masterBranchNamesByCodeType[language])
    return commit.message().match(/^.* ([0-9a-f]+)\n/)![1]!
}

export async function GetAppStatusHandler (req: Request, res: ResponseToolkit): Promise<api.AppStatus.Response> {
    const commonRequest = await getValidCommonRequest(req, false)
    const isJapan = !('languageCodeType' in commonRequest)
    const languageCodeType = commonRequest.languageCodeType ?? api.LanguageCodeType.Ja
    const inherentLanguageSuffix = isJapan && isCustomBaseUrl() ? 'ja/' : ''
    const server = isJapan ? 'jp' : 'ww'
    const japanResponse = {
        masterBaseUrl: `${baseUrl[server]}/master/${inherentLanguageSuffix}`,
        // masterBaseUrl: `${officialBaseUrl[server]}/master/`,
        masterCacheKey: await masterCacheKey(languageCodeType),
        resourceBaseUrl: `${baseUrl[server]}/resource/${inherentLanguageSuffix}`,
        // resourceBaseUrl: `${officialBaseUrl[server]}/resource/`,
        resourceCacheKey: await resourceCacheKey(languageCodeType),
        // imageBaseUrl: `${baseUrl[server]}/image/${inherentLanguageSuffix}`,
        imageBaseUrl: `${officialBaseUrl[server]}/image/`,
        termsUrl: `https://legal.bandainamcoent.co.jp/terms/${isJapan ? 'nejp' : ''}`,
        termsVersion: 1,
        privacyPolicyUrl: `https://legal.bandainamcoent.co.jp/privacy/${isJapan ? 'jp' : ''}`,
        privacyPolicyVersion: 1,
        updateType: isJapan ? 0 : 1,
        // FIXME check other updateTypes and reviewUrl
    }
    if (isJapan)
        return japanResponse
    else
        return {
            ...japanResponse,
            updateType: 1,
            gdprVersions: [
                {
                    itemType: 1,
                    version: 1,
                },
                {
                    itemType: 2,
                    version: 1,
                },
            ],
        }
}

async function createSession(userId: number, uuid: string, newUserSession: boolean) {
    if (userId !== (userId | 0))
        return

    const buffer = Buffer.allocUnsafe(16)
    buffer.writeInt32BE(userId)
    crypto.randomFillSync(buffer, 4)
    if (newUserSession)
        buffer.writeUInt8(buffer.readUInt8(4) | 0x80, 4)
    else
        buffer.writeUInt8(buffer.readUInt8(4) & 0x7F, 4)

    const cipher = crypto.createCipheriv('aes-128-ecb', Buffer.from(sessionIdKey, 'hex'), null).setAutoPadding(false)
    const encrypted = (cipher.update(buffer, undefined, 'hex') + cipher.final('hex'))

    return {
        sessionId: encrypted,
        encryptionKey: getEncryptionKey(buffer),
    }
}

function getEncryptionKey(decryptedSessionId: Buffer) {
    const hmac = crypto.createHmac('md5', Buffer.from(encryptionKeyKey, 'hex'))
    hmac.update(decryptedSessionId)
    return hmac.digest('hex')
}

export async function getSession(sessionId: string) {
    if (!sessionId.match(/^[0-9a-f]{32}$/))
        return

    const decipher = crypto.createDecipheriv('aes-128-ecb', Buffer.from(sessionIdKey, 'hex'), null).setAutoPadding(false)
    const decrypted = Buffer.concat([decipher.update(sessionId, 'hex'), decipher.final()])

    const userId = decrypted.readInt32BE()
    // if (userId <= 0)
    // 	return

    return {
        userId,
        encryptionKey: getEncryptionKey(decrypted),
    }
}

export async function LoginHandler (req: Request, res: ResponseToolkit): Promise<api.UserLogin.Response> {
    const commonRequest = await getValidCommonRequest(req, false)
    const payload = req.payload as api.UserLogin.Request
    let triggerPrettyDownload = false
    if (payload.userId /*>= 0x02_00_00_00*/) {
        const [[result]] = await pool.execute<mysql.RowDataPacket[]>(
            'select `first_tutorial_state` from `user` where `user_id` = ? and `uuid` = ?',
            [
                payload.userId,
                payload.uuid,
            ],
        )
        if (!result)
            throw digiriseError(api.ErrorNumber.UserNotExists)
        await pool.execute(
            'update `user` set `last_user_login` = now() where `user_id` = ?',
            [
                payload.userId,
            ],
        )
        triggerPrettyDownload = result['first_tutorial_state'] <= api.FirstTutorialState.Download
    }
    const newSession = await createSession(payload.userId, payload.uuid, triggerPrettyDownload)
    if (!newSession)
        throw new Error
    const japanResponse = {
        sessionId: newSession.sessionId,
        encryptionKey: newSession.encryptionKey,
        isLoadNecessary: true,  // FIXME
    }
    if (!('languageCodeType' in commonRequest))
        return japanResponse
    else
        return {
            ...japanResponse,
            languageChangeableCount: 3,
            voiceChangeableCount: 3,
        }
}