import Boom from '@hapi/boom'
import * as Bourne from '@hapi/bourne'
import Hapi from '@hapi/hapi'
import type {Request} from '@hapi/hapi'
import inert from '@hapi/inert'
import crypto from 'crypto'
import * as api from 'digi-rise/apitypes'
import {DigiriseSession, mainJpUser, searchGlobalUser, stripResponse} from 'digi-rise/client'
import * as client from 'digi-rise/client'
import {DefaultTamerNameMaster, DigimonBookMaster, MasterManifest, ResourceManifest, TamerLevelMaster, TextMaster} from 'digi-rise/master'
import {servers} from 'digi-rise/server'
import type {Server} from 'digi-rise/server'
import {now, parseDate} from 'digi-rise/util'
import {promises as fs} from 'fs'
import mysql from 'mysql2/promise'
import NodeGit from 'nodegit'
import type {Tree} from 'nodegit'
import path from 'path'
import stream from 'stream'
import {promisify} from 'util'
import {v4 as uuidv4} from 'uuid'
import zlib from 'zlib'

import {db as dbConfig, encryptionKeyKey, loginEncryptionKey, masterEncryptionKey, masterRepositoryPath, resourceEncryptionKey, resourceRepositoryPath, sessionIdKey} from './config.json'
// import homeStatusEvery from './home-statusEvery.json'
import homeStatusIntervals from './home-statusIntervals.json'

const deflateRaw = promisify(zlib.deflateRaw)

const baseUrl = {
	jp: 'https://toothless.drago.nz/dra',
	ww: 'https://toothless.drago.nz/dra',
}
const officialBaseUrl = {
	jp: 'https://cache.digi-rise.com',
	ww: 'https://digirige-os-cache.channel.or.jp',
}
// const baseUrl = 'http://localhost:3000'
const customBaseUrl = !baseUrl.jp.match(/^https:\/\/(cache\.digi-rise\.com|digirige-os-cache\.channel\.or\.jp)$/)
const appVersion = '99.9.0'

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

const homeStatusEvery = {
	"informationList": [],
	"unreceivedPresentCount": 0,
	"unreceivedMissionIds": [],
	"userHatchingCapsuleList": [
		{
			"userHatchingCapsuleId": 1,
			"userDigimonId": -1,
			"itemId": -1,
			"level": 0,
			"requiredNextBit": 0,
			"endCoolingDate": "2000-01-01T00:00:00+09:00"
		},
		{
			"userHatchingCapsuleId": 2,
			"userDigimonId": -1,
			"itemId": -1,
			"level": 0,
			"requiredNextBit": 0,
			"endCoolingDate": "2000-01-01T00:00:00+09:00",
			// "trademarkId": 6
		}
	],
	"questHistoryId": -1,
	"adventureInfo": {
		"isEncountRaid": false,
		"isRescuedRaid": false,
		"isOpenReview": false,
		"isEndRaid": false,
		"questLastPlayTime": "2000-01-01T00:00:00+09:00",
		// "underworldLastPlayTime": "2000-01-01T00:00:00+09:00"
	},
	// "clanCapsuleChildDigimon": ??,  // maybe when visiting clan members?
	"unreceivedChallengeIdList": [],
	"newChallengeGroupIdList": [],
	"isActiveChallenge": false,
	"raidEventInSessionList": [],
	"scenarioEventInSessionList": [],
	"isEntryBP2": false,
	"isOpeningXLB": false,
	"bceInSessionList": [],
	"resetTeamIdList": [],  // [ 8001, 8011, 8021, 6001 ]
	"mprInSessionList": []
}

function digiriseError(errorNumber: api.ErrorNumber) {
	const boom = new Boom.Boom()
	boom.output.payload = {errorNumber} as unknown as Boom.Payload
	return boom
}

function formatDate(date: Date | number = Date.now()) {
	if (date instanceof Date)
		date = date.getTime()
	const jstDateAsFakeUtc = new Date(date + 32400000)
	return jstDateAsFakeUtc.toISOString().replace(/\..*/, '+09:00')
}

function shuffleInPlace<T>(array: T[]): T[] {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.random() * (i + 1) | 0
		;[array[i], array[j]] = [array[j]!, array[i]!]
	}
	return array
}

class XorStream extends stream.Transform {
	#offset: number
	// key0: number
	// key1: number
	// key2: number
	// key3: number
	// key4: number
	// key5: number
	// key6: number
	// key7: number
	constructor(readonly key: Buffer) {
		super()
		// if (key.length !== 32)
		// 	throw new Error('XorStream requires a key exactly 32 bytes long')
		this.#offset = 0
		// this.key0 = key.readInt32BE(0)
		// this.key1 = key.readInt32BE(4)
		// this.key2 = key.readInt32BE(8)
		// this.key3 = key.readInt32BE(12)
		// this.key4 = key.readInt32BE(16)
		// this.key5 = key.readInt32BE(20)
		// this.key6 = key.readInt32BE(24)
		// this.key7 = key.readInt32BE(28)
	}
	override _transform(chunk: any, encoding: BufferEncoding, callback: stream.TransformCallback): void {
		// const leadingBytes = this.#offset ? Math.min(32 - this.#offset, chunk.length) : 0
		// for (let i = 0; i < leadingBytes; i++)
		for (let i = 0, n = chunk.length; i < n; i++, this.#offset++)
			chunk.writeUInt8(chunk.readUInt8(i) ^ this.key.readUInt8(this.#offset %= this.key.length), i)
		// switch ((chunk.length - leadingBytes) / 4 | 0)
		// for (let i = 0, n = chunk.length - 3; i < n; i += 4) {
		// 	chunk.writeInt32BE(chunk.readInt32BE(i) ^ key.readInt32BE())
		// }
		callback(null, chunk)
	}
}

type SimpleLanguageTag = 'ja' | 'en' | 'ko' | 'zh'

const masterRepository = NodeGit.Repository.open(masterRepositoryPath)
const masterBranchNamesByCodeType = {
	[api.LanguageCodeType.Ja]: 'master',
	[api.LanguageCodeType.En]: 'en',
	[api.LanguageCodeType.Ko]: 'ko',
	[api.LanguageCodeType.Zh]: 'zh',
}
const masterBranchNamesByDirectory: { [key: string]: string } = {
	ja: 'master',
	en: 'en',
	ko: 'ko',
	zh: 'zh',
}
async function masterCacheKey(language: api.LanguageCodeType): Promise<string> {
	const repo = await masterRepository
	const commit = await repo.getBranchCommit(masterBranchNamesByCodeType[language])
	return commit.message().match(/^.* ([0-9a-f]+)\n/)![1]!
}
async function masterVersion(language: api.LanguageCodeType): Promise<string> {
	const repo = await masterRepository
	const commit = await repo.getBranchCommit(masterBranchNamesByCodeType[language])
	const when = commit.author().when()
	const localDateAsFakeUtc = new Date(when.time() * 1000 + when.offset() * 60000)
	return localDateAsFakeUtc.toISOString().replace(/\..*/, '').replace(/T/, ' ')
}
interface Masters {
	tree: Tree
	manifest: MasterManifest
}
async function masterTree(language: api.LanguageCodeType | string, cacheKey?: string): Promise<Tree | undefined> {
	const branchName = typeof language === 'string' ? masterBranchNamesByDirectory[language] : masterBranchNamesByCodeType[language]
	if (!branchName)
		return
	const repo = await masterRepository
	const commit = await repo.getBranchCommit(branchName)
	if (cacheKey !== undefined && cacheKey !== commit.message().match(/^.* ([0-9a-f]+)\n/)![1])
		return
	return commit.getTree()
}
async function getMasters(language: api.LanguageCodeType | string, cacheKey?: string): Promise<Masters | undefined> {
	const tree = await masterTree(language, cacheKey)
	if (!tree)
		return
	const manifestBlob = await tree.entryByName('master_manifest.json').getBlob()
	return {
		tree: tree,
		manifest: JSON.parse(manifestBlob.toString()),
	}
}

async function allDigimonCodes(language: api.LanguageCodeType): Promise<string[]> {
	const repo = await masterRepository
	const commit = await repo.getBranchCommit(masterBranchNamesByCodeType[language])
	const tree = await commit.getTree()
	const blob = await tree.entryByName('mst_digimon_book.json').getBlob()
	const master = new DigimonBookMaster(JSON.parse(blob.toString()))
	const now = Date.now()
	let codes = []
	for (const entry of master.values())
		if (parseDate(entry.startDate).getTime() <= now)
			codes.push(entry.code)
	return codes
}

const resourceRepository = NodeGit.Repository.open(resourceRepositoryPath)
const resourceDirectoryNames: { [lct in api.LanguageCodeType]: SimpleLanguageTag } = {
	[api.LanguageCodeType.Ja]: 'ja',
	[api.LanguageCodeType.En]: 'en',
	[api.LanguageCodeType.Ko]: 'ko',
	[api.LanguageCodeType.Zh]: 'zh',
}
async function resourceTree(): Promise<Tree> {
	const repo = await resourceRepository
	const commit = await repo.getBranchCommit('master')
	return commit.getTree()
}
async function resourceVersion(language: api.LanguageCodeType | SimpleLanguageTag, tree?: Tree): Promise<string> {
	if (typeof language === 'number')
		language = resourceDirectoryNames[language]
	if (tree === undefined)
		tree = await resourceTree()
	const entry = await tree.getEntry(`${language}/asset/android/manifest`)
	const blob = await entry.getBlob()
	return JSON.parse(blob.toString()).version
}
function versionToCacheKey(version: string): string {
	const hash = crypto.createHash('md5')
	hash.update(version)
	return hash.digest('hex')
}
async function resourceCacheKey(language: api.LanguageCodeType | SimpleLanguageTag, tree?: Tree): Promise<string> {
	return versionToCacheKey(await resourceVersion(language, tree))
}
function cacheKey(manifest: {version: string}): string {
	return versionToCacheKey(manifest.version)
}
interface Resources {
	path: string
	tree: Tree
}
async function getResources(language: string): Promise<Resources | undefined> {
	if (language !== 'ja' && language !== 'en' && language !== 'ko' && language !== 'zh')
		return
	const tree = await resourceTree()
	return {
		path: `${resourceRepositoryPath}/${language}/`,
		tree: tree
	}
}

async function getValidCommonRequest(request: Request, verifyAllVersions: boolean = true): Promise<api.CommonRequest> {
	const payload: any = request.payload
	if (typeof payload !== 'object')
		throw new Error

	if (!('commonRequest' in payload))
		throw new Error
	const commonRequest = payload.commonRequest
	if (typeof commonRequest !== 'object')
		throw new Error

	if (!('osType' in commonRequest))
		throw new Error
	if (commonRequest.osType !== api.OsType.iOS && commonRequest.osType !== api.OsType.Android)
		throw new Error

	if (!('version' in commonRequest))
		throw new Error
	const {version} = commonRequest
	if (typeof version !== 'object')
		throw new Error

	if (!('appVersion' in version) || typeof version.appVersion !== 'string' ||
	    !('masterVersion' in version) || typeof version.masterVersion !== 'string' ||
	    !('resourceVersion' in version) || typeof version.resourceVersion !== 'string')
		throw new Error

	let languageCodeType: api.LanguageCodeType
	if ('languageCodeType' in commonRequest) {
		const {languageCodeType: lct} = commonRequest
		if (lct !== api.LanguageCodeType.En &&
		    lct !== api.LanguageCodeType.Ko &&
		    lct !== api.LanguageCodeType.Zh)
			throw new Error
		languageCodeType = lct
	} else {
		languageCodeType = api.LanguageCodeType.Ja
	}

	if (version.appVersion !== appVersion)
		throw digiriseError(api.ErrorNumber.ApplicationUpdate)
	if (verifyAllVersions) {
		if (version.masterVersion !== '' && version.masterVersion !== await masterVersion(languageCodeType) ||
		    version.resourceVersion !== '' && version.resourceVersion !== await resourceVersion(languageCodeType)) {
			// console.warn({
			// 	expected: {
			// 		masterVersion: await masterVersion(languageCodeType),
			// 		resourceVersion: await resourceVersion(languageCodeType),
			// 	}
			// })
			throw digiriseError(api.ErrorNumber.MasterOrResourceUpdate)
		}
	}

	return commonRequest
}

function getEncryptionKey(decryptedSessionId: Buffer) {
	const hmac = crypto.createHmac('md5', Buffer.from(encryptionKeyKey, 'hex'))
	hmac.update(decryptedSessionId)
	return hmac.digest('hex')
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
async function getSession(sessionId: string) {
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

function isUserCreateSession(sessionId: string) {
	const decipher = crypto.createDecipheriv('aes-128-ecb', Buffer.from(sessionIdKey, 'hex'), null).setAutoPadding(false)
	const decrypted = Buffer.concat([decipher.update(sessionId, 'hex'), decipher.final()])
	return !!(decrypted.readUInt8(4) & 0x80)
}

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

async function getUserData(pool: mysql.Pool, userId: number, language: api.LanguageCodeType, triggerPrettyDownload: boolean, tamerName?: string): Promise<api.UserData> {
	let userReadScenarioIdList = [
		10101, 10102, 10103, 10104, 10105, 10106,
		10201, 10202, 10203, 10204, 10205, 10206, 10221, 10222, 10223, 10224, 10225, 10226, 10227,
		10301, 10302, 10303, 10304, 10305, 10306, 10307, 10321, 10322, 10323, 10324, 10325,
		10401, 10402, 10403, 10404, 10405, 10406, 10421, 10422, 10423, 10424, 10425,
		10501, 10502, 10503, 10504, 10505, 10506, 10521, 10522, 10523, 10524, 10525,
		10601, 10602, 10603, 10604, 10605, 10606, 10607, 10621, 10622, 10623, 10624, 10625,
		10701, 10702, 10703, 10704, 10705, 10706, 10707, 10708, 10721, 10722, 10723, 10725, 10726,
		10801, 10802, 10803, 10804, 10805, 10806, 10807, 10808, 10821, 10822, 10823, 10824, 10825,
		10901, 10902, 10903, 10904, 10905, 10906, 10907, 10908, 10921, 10922, 10923, 10924, 10925,
		11001, 11002, 11003, 11004, 11005, 11006, 11007, 11008, 11021, 11022, 11023, 11024, 11025,
		11101, 11102, 11103, 11104, 11105, 11106, 11107, 11108, 11121, 11122, 11123, 11124, 11125,
		11201, 11202, 11203, 11204, 11205, 11206, 11207, 11208, 11221, 11222, 11223, 11224, 11225,
		11301, 11302, 11303, 11304, 11305, 11306, 11307, 11321, 11322, 11323, 11324, 11325,
		11401, 11402, 11403, 11404, 11405, 11406, 11407, 11408, 11421, 11422, 11423, 11424, 11425,
		11501, 11502, 11503, 11504, 11505, 11506, 11507, 11508, 11521, 11522, 11523, 11524, 11525,
		11601, 11602, 11603, 11604, 11605, 11606, 11607, 11608, 11621, 11622, 11623, 11624, 11625,
		11701, 11702, 11703, 11704, 11705, 11706, 11707, 11708, 11721, 11722, 11723, 11724, 11725,
		11801, 11802, 11803, 11804, 11805, 11806, 11807, 11808, 11821, 11822, 11823, 11824, 11825,
		11901, 11902, 11903, 11904, 11905, 11906, 11907, 11908, 11921, 11922, 11923, 11924, 11925,
		12001, 12002, 12003, 12004, 12005, 12006, 12007, 12008, 12021, 12022, 12023, 12024, 12025,
		12101, 12102, 12103, 12104, 12105, 12106, 12107, 12108, 12121, 12122, 12123, 12124, 12125,
		12201, 12202, 12203, 12204, 12205, 12221, 12222,
		12301, 12302, 12303,
		12401, 12402, 12403, 12404, 12405, 12421, 12422, 12423,
		20101, 20102, 20103, 20104, 20105, 20106, 20107, 20108, 20121, 20122, 20123, 20124, 20125,
		20201, 20202, 20203, 20204, 20205, 20206, 20207, 20208, 20209, 20210, 20221, 20222, 20223, 20224, 20225,
		20301, 20302, 20303, 20304, 20305, 20306, 20307, 20308, 20309, 20310, 20321, 20322, 20323, 20324, 20325,
		20401, 20402, 20403, 20404, 20405, 20406, 20407, 20408, 20421, 20422, 20423, 20424, 20425,
		20501, 20502, 20503, 20504, 20505, 20506, 20507, 20508, 20509, 20521, 20522, 20523, 20524, 20525,
		20601, 20602, 20603, 20604, 20605, 20606, 20607, 20608, 20621, 20622, 20623, 20624, 20625,
		20701, 20702, 20703, 20704, 20705, 20706, 20707, 20708, 20721, 20722, 20723, 20724, 20725,
		20801, 20802, 20803, 20804, 20805, 20806, 20807, 20808, 20821, 20822, 20823, 20824, 20825,
		20901, 20902, 20903, 20904, 20905, 20906, 20907, 20908, 20921, 20922, 20923, 20924, 20925,
		21001, 21002, 21003, 21004, 21005, 21006, 21007, 21008, 21021, 21022, 21023, 21024, 21025,
		21101, 21102, 21103, 21104, 21105, 21106, 21107, 21108, 21121, 21122, 21123, 21124, 21125,
		21201, 21202, 21203, 21204, 21205, 21206, 21207, 21208, 21209, 21210, 21221, 21222, 21223, 21224, 21225,
		21301, 21302, 21303, 21304, 21305, 21306, 21307, 21308, 21321, 21322, 21323, 21324, 21325,
		21401, 21402, 21403, 21404, 21405, 21406, 21407, 21408, 21409, 21421, 21422, 21423, 21424, 21425,
		21501, 21502, 21503, 21504, 21505, 21506, 21507, 21508, 21509, 21510, 21521, 21522, 21523, 21524, 21525,
		21601, 21602, 21603, 21604, 21605, 21606, 21607, 21608, 21621, 21622, 21623, 21624, 21625,
		21701, 21702, 21703, 21704, 21705, 21706, 21707, 21708, 21721, 21722, 21723, 21724, 21725,
		21801, 21802, 21803, 21804, 21805, 21806, 21807, 21808, 21821, 21822, 21823, 21824, 21825,
		21901, 21902, 21903, 21904, 21905, 21906, 21907, 21908, 21909, 21921, 21922, 21923, 21924,
		22001, 22002, 22003, 22004, 22005, 22006, 22007, 22008, 22009,
		22101, 22102, 22103, 22104, 22105, 22106, 22107, 22108, 22121, 22122, 22123, 22124, 22125, 22126,
		50011, 50012, 50013, 50014, 50015, 50021, 50022, 50023, 50041, 50042, 50043, 50051, 50052,
		50053, 50054, 50061, 50062, 50063, 50064, 50065, 50071, 50072, 50073, 50074, 50075,
		60011, 60012, 60013, 60014, 60015, 60021, 60022, 60023, 60024, 60025, 60031, 60032, 60033,
		60034, 60035, 60041, 60042, 60043, 60044, 60045, 60051, 60052, 60053, 60054, 60055, 60061,
		60062, 60063, 60064, 60065, 60071, 60072, 60073, 60074, 60075, 60081, 60082, 60083, 60084,
		60085, 60091, 60092, 60093, 60094, 60095, 60111, 60112, 60113, 60114, 60115, 60121, 60122,
		60123, 60124, 60125, 60131, 60132, 60133, 60134, 60135, 60141, 60142, 60143, 60144, 60145,
		60151, 60152, 60153, 60154, 60155, 60161, 60162, 60163, 60164, 60165, 60171, 60172, 60173,
		60174, 60175, 60181, 60182, 60183, 60184, 60185, 60186, 60191, 60192, 60193, 60194, 60195,
		60196, 60201, 60202, 60203, 60204, 60205, 60206, 60221, 60222, 60223, 60224, 60225, 60226,
		62110, 62111, 62112, 62113,
		70011, 70501, 70502, 70503, 70601, 70701, 70801, 70901, 70902, 71003, 71004, 71005, 71006,
		71007, 71008, 71009, 71010, 71011, 71111, 71112,
		80011,
		90071, 90072, 90101, 90102, 90111, 90112, 90131, 90132, 90141, 90142, 90171, 90172, 90211,
		90212, 90221, 90222, 90231, 90232, 90233, 90234, 90241, 90242, 90251, 90252, 90261, 90262,
		90271, 90272, 90273, 90281, 90282, 90283, 90284, 90291, 90292, 90301, 90302, 90303, 90311,
		90312, 90321, 90322, 90331, 90332, 90333, 90341, 90342, 90351, 90352, 90353, 90361, 90371,
		90372, 90373, 90381, 90391, 90401, 90402, 90411, 90421, 90422, 90431, 90432, 90433, 90441,
		90451, 90461, 90471, 90481, 90491, 90501, 90502, 90511, 90521, 90522, 90523, 90531, 90541,
		90551, 90561, 90562, 90571, 90581, 90591, 90601, 90602, 90603, 90611, 90612, 90621, 90622,
		90631, 90641, 90651, 90652, 90661, 90671, 90681, 90691, 90701, 90711, 90721, 90731, 90741,
		90751, 90761, 90762, 90771, 90781, 90791, 90792, 90801, 90811, 90821, 90822, 90823, 90831,
		90832, 90841, 90842, 90851, 90861, 90881, 90891, 90892, 90911, 90912, 90941, 90971, 90972,
		90981, 90982, 90983, 91001, 91011, 91012, 91031, 91051, 91061, 91081, 91111, 91131, 91141,
		91171, 91181, 91182, 91183, 91201,
	]
	if (language === api.LanguageCodeType.Ja) {
		userReadScenarioIdList.push(50031)
		userReadScenarioIdList.push(50032)
		userReadScenarioIdList.push(50033)
		userReadScenarioIdList.push(60101)
		userReadScenarioIdList.push(60102)
		userReadScenarioIdList.push(60103)
		userReadScenarioIdList.push(60104)
		userReadScenarioIdList.push(60105)
		userReadScenarioIdList.push(60211)
		userReadScenarioIdList.push(60212)
		userReadScenarioIdList.push(60213)
		userReadScenarioIdList.push(60214)
		userReadScenarioIdList.push(60215)
		userReadScenarioIdList.push(60216)
		userReadScenarioIdList.push(60217)
		userReadScenarioIdList.push(60218)
		userReadScenarioIdList.push(60219)
		userReadScenarioIdList.sort()
	}
	const userEndTutorialTypeList = [
		214, 204, 307, 300, 208, 206, 301, 302, 209, 203, 202, 308, 303,
		210, 200, 211, 201, 212, 304, 305, 306, 213, 215, 309, 310
	]
	const digimonCodeList = await allDigimonCodes(language)
	let saved
	if (userId < 0x02_00_00_00) {
		const [serverName, serverUserId] =
			language === api.LanguageCodeType.Ja
				? [servers.jp.apiUrlBase.match(/\/\/([^/]+)\//)![1]!, userId]
				: [servers.ww.apiUrlBase.match(/\/\/([^/]+)\//)![1]!, userId ^ 0x01_00_00_00]
		;[[saved]] = await pool.execute<mysql.RowDataPacket[]>(
			'select `user_getAll` from `legacy_accounts` where `server` = ? and `user_id` = ? and `user_getAll` is not null order by `last_attempt` desc limit 1',
			[
				serverName,
				serverUserId,
			],
		)
	}
	if (!triggerPrettyDownload)
		userEndTutorialTypeList.unshift(100)
	if (saved) {
		const savedUserGetAll: api.UserGetAll.Response = JSON.parse(saved['user_getAll'])
		const savedUserData = savedUserGetAll.userData
		const userQuestList = savedUserData.userQuestList.filter(uq => uq.questId <= 1005020)
		const nextUserQuest = userQuestList.find(uq => uq.questId === 1005020)
		if (nextUserQuest) {
			nextUserQuest.playState = api.QuestPlayState.New
			nextUserQuest.clearedEvaluationIdList = []
		}
		return {
			...savedUserData,
			userResumeQuest: [],
			userUnlockedWeeklySectionList: [],
			assignedClanId: api.UserData.EmptyClanId,
			userReadScenarioIdList,
			userEndTutorialTypeList,
			digimonCodeList,
			userBackupType: api.BackupType.Password,
			userQuestList,
		}
	}
	if (!tamerName) {
		const masters = (await getMasters(language))!
		const blob = await masters.tree.entryByName('mst_default_tamer_name.json').getBlob()
		tamerName = new DefaultTamerNameMaster(JSON.parse(blob.toString())).get(1)!.tamerName
	}
	return {
		personal: {
			userId,
			name: tamerName,
			exp: 0,
			// level: 1,  // wut?? this isn't declared
			stamina: 30,
			staminaMax: 30,
			staminaChangeTime: '2000-01-01T00:00:00+09:00',
			partnerDigimonId: 1,
			digimonMaxCount: 250,
			pluginMaxCount: 250,
			decoMaxCount: 100,
			freeDigiruby: 0,
			paidDigiruby: 0,
			friendCode: '000000000',
			addFriendMaxNum: 80,
			// birthday: ??,
		},
		userDigimonList: [
			{
				userDigimonId: 1,
				digimonId: 1417105,
				isLocked: true,
				isEcLocked: false,
				bit: 14760000,
				level: 150,
				maxLevel: 150,
				friendshipPoint: 406290,
				// friendshipLevel: 99,
				maxFriendshipLevel: 99,
				moodValue: 0,
				skillLevel: 15,
				executionLimitbreakId: api.UserData.CompletedLimitbreakId,
				completeTrainingIds: [],
				wearingPluginList: [
					{
						slotId: 0,
						userPluginId: api.UserData.EmptyUserPluginId,
						isLocked: false,
					},
					{
						slotId: 1,
						userPluginId: api.UserData.EmptyUserPluginId,
						isLocked: false,
					},
					{
						slotId: 2,
						userPluginId: api.UserData.EmptyUserPluginId,
						isLocked: false,
					},
					{
						slotId: 3,
						userPluginId: api.UserData.EmptyUserPluginId,
						isLocked: false,
					},
					{
						slotId: 4,
						userPluginId: api.UserData.EmptyUserPluginId,
						isLocked: false,
					},
					{
						slotId: 5,
						userPluginId: api.UserData.EmptyUserPluginId,
						isLocked: false,
					},
				],
				addFriendshipPointByPeriod: 0,
				lastCareTime: '2000-01-01T00:00:00+09:00',
				lastBrokenSlbNecessaryLevel: 145,
				awakingLevel: 3,
			},
		],
		userTeamList: [
			// {
			// 	"teamId": 1001,
			// 	"userDigimonList":
			// 	[
			// 		1,
			// 		api.UserData.EmptyUserDigimonId,
			// 		api.UserData.EmptyUserDigimonId,
			// 		api.UserData.EmptyUserDigimonId,
			// 		api.UserData.EmptyUserDigimonId
			// 	]
			// },
		],
		userQuestList: [
			{
				questId: 1001010,
				playState: 0,
				clearedEvaluationIdList: [],
			},
			// {
			// 	questId: 1101010,
			// 	playState: 0,
			// 	clearedEvaluationIdList: [],
			// },
		],
		homeDigimonList: [
			api.UserData.EmptyUserDigimonId,
			api.UserData.EmptyUserDigimonId,
			api.UserData.EmptyUserDigimonId,
			api.UserData.EmptyUserDigimonId,
			api.UserData.EmptyUserDigimonId,
			api.UserData.EmptyUserDigimonId,
			api.UserData.EmptyUserDigimonId,
		],
		userDecoList: [],
		userItemList: [
			{itemId: 24001, count: 1},
		],
		userPluginList: [],
		userDigiconne: {
			digiconneItemId: 24001,
			lastObtainItemStep: 0,
			lastObtainItemDate: '2000-01-01T00:00:00+09:00',
			lastPassingItemStep: 0,
			lastPassingItemDate: '2000-01-01T00:00:00+09:00',
		},
		userHatchingCapsuleList: [
			{
				"userHatchingCapsuleId": 1,
				"userDigimonId": api.UserData.EmptyDigimonId,
				"itemId": api.UserData.EmptyItemId,
				"level": 0,
				"requiredNextBit": 0,
				"endCoolingDate": "2000-01-01T00:00:00+09:00"
			},
			{
				"userHatchingCapsuleId": 2,
				"userDigimonId": api.UserData.EmptyDigimonId,
				"itemId": api.UserData.EmptyItemId,
				"level": 0,
				"requiredNextBit": 0,
				"endCoolingDate": "2000-01-01T00:00:00+09:00",
				// "trademarkId": 6
			}
		],
		userResumeQuest: [],
		userUnlockedWeeklySectionList: [],
		userPresentLogList: [],
		userSocialPresentLogList: [],
		assignedClanId: api.UserData.EmptyClanId,
		userUnderworldList: [
			{
				underworldId: 1,
				floor: 1,
				playState: api.QuestPlayState.New,
			},
		],
		userBattlePark: {
			bpStamina: 5,
			// bpChangeTime: "2999-01-01T00:00:00+09:00"
			bpChangeTime: "2000-01-01T00:00:00+09:00"
		},
		userReadScenarioIdList,
		// userTutorial: null,
		userEndTutorialTypeList,
		digimonCodeList,
		userBackupType: api.BackupType.Invalid,
		lastReviewBattleAppVersion: appVersion,
		userStartChallengeGroupIdList: [],
	}
}

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

	const pool = await mysql.createPool({
		user: dbConfig.user,
		password: dbConfig.password,
		database: dbConfig.database,
		waitForConnections: true,
		connectionLimit: 20,
		queueLimit: 0,
	})

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
				try { await backgroundPromise } catch (e) {}
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

	server.ext('onPreResponse', (request, h) => {
		const response = request.response
		if (Boom.isBoom(response)) {
			// console.error(request, response)
			if (request.path.match(/^\/api\//) && response.output.statusCode === 500) {
				response.output.statusCode = 200
				if (!('errorNumber' in response.output.payload)) {
					const error: api.Error = {errorNumber: api.ErrorNumber.ServerError}
					response.output.payload = error as unknown as Boom.Payload
				}
			}
			return h.continue
		} else if (response.variety === 'stream' || !request.auth?.artifacts?.encryptionKey || response.source === null) {
			// console.log(response.source)
			return h.continue
		} else {
			// console.log(response.source)
			const bytes = response.variety === 'buffer' ? response.source as Buffer : typeof response.source === 'object' ? Buffer.from(JSON.stringify(response.source)) : Buffer.from(String(response.source))
			const paddedCipherIv = crypto.randomBytes(20)
			const cipher = crypto.createCipheriv('aes-256-cbc', request.auth.artifacts.encryptionKey, paddedCipherIv.slice(2, 18))
			const encrypted = Buffer.concat([paddedCipherIv, cipher.update(bytes), cipher.final()])
			if (request.auth.artifacts.base64)
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
		handler: async (request, h) => {
			const masters = await getMasters(request.params['language'], request.params['cacheKey'])
			if (!masters)
				return h.response().code(404)
			else if (request.params['hashName'] === 'E3FE0CBF2BC630C7E996F15DE1DD32A9')
				return masters.manifest
			else {
				const master = masters.manifest.masters.find(m => m.hashName === request.params['hashName'])
				if (!master)
					return h.response().code(404)
				else {
					const name = master.masterName
					const blob = await masters.tree.entryByName(`${name}.json`).getBlob()
					const content = Buffer.from(JSON.stringify(JSON.parse(blob.toString())))
					return deflateRaw(content, {windowBits: 15, level: 9, memLevel: 9})
				}
			}
		}
	})

	server.route({
		method: 'GET',
		path: '/resource/{language}/{cacheKey}/asset/{osType}/7f5cb74af5d7f4b82200738fdbdc5a45',
		options: {auth: 'resource', cache: false},
		handler: async (request, h) => {
			const osType = request.params['osType']
			if (osType !== 'ios' && osType !== 'android')
				return h.response().code(404)

			const language = request.params['language']
			const resources = await getResources(language)
			if (!resources)
				return h.response().code(404)

			const manifestEntry = await resources.tree.getEntry(`${language}/asset/${osType}/manifest`)
			const manifestBlob = await manifestEntry.getBlob()
			const manifest: ResourceManifest = JSON.parse(manifestBlob.toString())
			if (request.params['cacheKey'] !== cacheKey(manifest))
				return h.response().code(404)

			return manifest
		}
	})

	server.route({
		method: 'GET',
		path: '/resource/{language}/{cacheKey}/asset/{osType}/{path*}',
		options: {auth: false, cache: false},
		handler: async (request, h) => {
			const path = request.params['path']
			if (path.indexOf('.') >= 0/* || path.substring(0, 1) === '/'*/)
				return h.response().code(404)

			const osType = request.params['osType']
			if (osType !== 'ios' && osType !== 'android')
				return h.response().code(404)

			const language = request.params['language']
			const resources = await getResources(language)
			if (!resources)
				return h.response().code(404)

			const manifestEntry = await resources.tree.getEntry(`${language}/asset/${osType}/manifest`)
			const manifestBlob = await manifestEntry.getBlob()
			const manifest: ResourceManifest = JSON.parse(manifestBlob.toString())
			if (request.params['cacheKey'] !== cacheKey(manifest))
				return h.response().code(404)

			for (const resource of manifest.resources) {
				if (path === resource.name.replace(/[^/]*$/, resource.hash)) {
					const handle = await fs.open(`${resources.path}asset/${osType}/${resource.name}`, 'r')
					return handle.createReadStream().pipe(new XorStream(Buffer.from(resourceEncryptionKey)))
				}
			}

			return h.response().code(404)
		}
	})

	server.route({
		method: 'GET',
		path: '/resource/{language}/{cacheKey}/{resourceKind}/{path*}',
		options: {auth: false, cache: false},
		handler: async (request, h) => {
			let path = request.params['path']
			let partIndex = undefined
			const m = path.match(/(^.*)\.(00[1-9]|0[1-9][0-9]|[1-9][0-9]{2})$/)
			if (m) {
				path = m[1]
				partIndex = +m[2]
			}

			if (path.indexOf('.') >= 0/* || path.substring(0, 1) === '/'*/)
				return h.response().code(404)

			let resourceKind = request.params['resourceKind']
			if ((resourceKind !== 'movie' || !partIndex) && (resourceKind !== 'sound' || partIndex))
				return h.response().code(404)

			const language = request.params['language']
			if (language !== 'ja') {
				const m2 = path.match(/^(en|jp)\/(.*)$/)
				if (!m2)
					return h.response().code(404)
				resourceKind = `${resourceKind}/${m2[1]}`
				path = m2[2]
			}

			const resources = await getResources(language)
			if (!resources)
				return h.response().code(404)

			if (request.params['cacheKey'] !== await resourceCacheKey(language, resources.tree))
				return h.response().code(404)

			const manifestEntry = await resources.tree.getEntry(`${language}/${resourceKind}/manifest`)
			const manifestBlob = await manifestEntry.getBlob()
			const manifest: ResourceManifest = JSON.parse(manifestBlob.toString())

			for (const resource of manifest.resources) {
				if (path === resource.name.replace(/[^/]*$/, resource.hash)) {
					if (partIndex && (partIndex - 1) * 4194304 >= resource.size)
						return h.response().code(404)
					// const handle = await fs.open(`${resources.path}${resourceKind}/${resource.name}`, 'r')
					// const stream = handle.createReadStream(partIndex ? {
					// 	start: (partIndex - 1) * 4194304,
					// 	end: partIndex * 4194304 - 1,
					// } : {})
					// return stream
					return h.file(`${resources.path}${resourceKind}/${resource.name}`, partIndex ? {
						start: (partIndex - 1) * 4194304,
						end: Math.min(partIndex * 4194304, resource.size) - 1,
						etagMethod: false,
					} : {etagMethod: false})
				}
			}

			return h.response().code(404)
		}
	})

	server.route({
		method: 'GET',
		path: '/resource/ja/{cacheKey}/{resourceKind}/7f5cb74af5d7f4b82200738fdbdc5a45',
		options: {auth: 'resource', cache: false},
		handler: async (request, h) => {
			let resourceKind = request.params['resourceKind']
			if (resourceKind !== 'movie' && resourceKind !== 'sound')
				return h.response().code(404)

			const language = 'ja'
			const resources = (await getResources(language))!
			if (request.params['cacheKey'] !== await resourceCacheKey(language, resources.tree))
				return h.response().code(404)

			const manifestEntry = await resources.tree.getEntry(`${language}/${resourceKind}/manifest`)
			const manifestBlob = await manifestEntry.getBlob()
			return JSON.parse(manifestBlob.toString())
		}
	})

	server.route({
		method: 'GET',
		path: '/resource/{language}/{cacheKey}/{resourceKind*2}/7f5cb74af5d7f4b82200738fdbdc5a45',
		options: {auth: 'resource', cache: false},
		handler: async (request, h) => {
			let resourceKind = request.params['resourceKind']
			if (!resourceKind.match(/^(movie|sound)\/(en|jp)$/))
				return h.response().code(404)

			const language = request.params['language']
			if (language === 'ja')
				return h.response().code(404)

			const resources = await getResources(language)
			if (!resources)
				return h.response().code(404)

			if (request.params['cacheKey'] !== await resourceCacheKey(language, resources.tree))
				return h.response().code(404)

			const manifestEntry = await resources.tree.getEntry(`${language}/${resourceKind}/manifest`)
			const manifestBlob = await manifestEntry.getBlob()
			return JSON.parse(manifestBlob.toString())
		}
	})

	server.route({
		method: 'GET',
		path: '/resource/{language}/{cacheKey}/builtin/m.{partIndex}',
		options: {auth: false, cache: false},
		handler: async (request, h) => {
			const m = request.params['partIndex'].match(/^00[1-9]|0[1-9][0-9]|[1-9][0-9]{2}$/)
			if (!m)
				return h.response().code(404)
			const partIndex = +m[0]

			const language = request.params['language']
			const resources = await getResources(language)
			if (!resources)
				return h.response().code(404)

			if (request.params['cacheKey'] !== await resourceCacheKey(language, resources.tree))
				return h.response().code(404)

			const handle = await fs.open(resources.path + 'builtin/m', 'r')
			const stat = await handle.stat()
			await handle.close()
			if ((partIndex - 1) * 4000000 >= stat.size)
				return h.response().code(404)
			// return handle.createReadStream({
			// 	start: (partIndex - 1) * 4000000,
			// 	end: partIndex * 4000000 - 1,
			// })
			return h.file(resources.path + 'builtin/m', {
				start: (partIndex - 1) * 4000000,
				end: Math.min(partIndex * 4000000, stat.size) - 1,
				etagMethod: false,
			})
		}
	})

	const globalWidgetInformation = {
		[api.LanguageCodeType.En]: 'Realize your Digimon adventure.\n',
		[api.LanguageCodeType.Ko]: '지금, 당신의 모험이 현실이 된다!\n',
		[api.LanguageCodeType.Zh]: '你的冒險，即將化為現實！\n',
	}
	server.route({
		method: 'POST',
		path: '/api/widgetInformation/get',
		options: {auth: false, payload: {allow: 'application/json'}},
		handler: (request, h) => {
			const payload: any = request.payload
			if (!payload)
				return '今、キミの冒険が現実となる！\n'
			const languageCodeType = payload.commonRequest?.languageCodeType
			const info = typeof languageCodeType === 'number' && (globalWidgetInformation as { [lct: number]: string })[languageCodeType]
			return info || globalWidgetInformation[api.LanguageCodeType.En]
		}
	})

	server.route({
		method: 'POST',
		path: '/api/app/status',
		options: {auth: 'login'},
		handler: async (request, h): Promise<api.AppStatus.Response> => {
			const commonRequest = await getValidCommonRequest(request, false)
			const isJapan = !('languageCodeType' in commonRequest)
			const languageCodeType = commonRequest.languageCodeType ?? api.LanguageCodeType.Ja
			const inherentLanguageSuffix = isJapan && customBaseUrl ? 'ja/' : ''
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
	})

	server.route({
		method: 'POST',
		path: '/api/user/create',
		options: {auth: 'login'},
		handler: async (request, h): Promise<api.WithCommonResponse<api.UserCreate.Response>> => { try {
		// handler: async (request, h): Promise<api.UserCreate.Response> => {
			const commonRequest = await getValidCommonRequest(request, false)

			const payload = request.payload as api.UserCreate.Request
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
		} catch (e) { console.error(`[${now()}]`, request.path, request.payload, e); throw e } }
	})

	server.route({
		method: 'POST',
		path: '/api/user/gdpr',
		options: {auth: 'login'},
		handler: async (request, h): Promise<api.UserGdpr.Response> => {
			const commonRequest = await getValidCommonRequest(request, false)
			const payload = request.payload as api.WithCommonRequest<api.UserGdpr.Request>

			if (typeof payload.consentFormItemData !== 'object' || !(payload.consentFormItemData instanceof Array))
				throw new Error('invalid `consentFormItemData`')
			if (!payload.consentFormItemData.every(x =>
					typeof x === 'object'
					&& 'itemType' in x
					&& 'isAccepted' in x
					&& 'version' in x
					&& typeof x.itemType === 'number'
					&& [1, 2].includes(x.itemType)
					&& typeof x.isAccepted === 'boolean'
					&& typeof x.version === 'number'
					&& [0, 1].includes(x.version)))
				throw new Error('invalid `consentFormItemData`')
			if (new Set(payload.consentFormItemData.map(x => x.itemType)).size !== payload.consentFormItemData.length)
				throw new Error('invalid `consentFormItemData`')

			const userId = request.auth.credentials.user!.userId
			await pool.execute(
				'update `user` set `consent_form_item_data` = ? where `user_id` = ?',
				[
					JSON.stringify(payload.consentFormItemData.map(x => ({
						itemType: x.itemType,
						isAccepted: x.isAccepted,
						version: 1,
					}))),
					userId,
				],
			)
			return {required: true}
		}
	})

	server.route({
		method: 'POST',
		path: '/api/migration/restorePassword',
		options: {auth: 'loginOrSession'},
		handler: async (request, h): Promise<api.MigrationRestorePassword.Response> => {
			const commonRequest = await getValidCommonRequest(request, false)
			const payload = request.payload as api.WithCommonRequest<api.MigrationRestorePassword.Request>
			return migrationRestorePassword(request.headers['user-agent'], commonRequest, payload)
		}
	})

	let webMigrationPromises = new Map<string, Promise<unknown>>()
	server.route({
		method: 'POST',
		path: '/api/migrate',
		options: {
			auth: false,
			payload: {
				allow: 'application/x-www-form-urlencoded',
			},
		},
		handler: async (request, h): Promise<string> => { try {
			if (typeof request.payload !== 'object') {
				console.dir(request.payload, {depth: null})
				throw new Error
			}
			const formPayload = request.payload as Record<string, unknown>
			if (formPayload['server'] !== 'jp' && formPayload['server'] !== 'ww')
				throw new Error('invalid `server`')
			const platformTypeString = formPayload['platformType']
			if (platformTypeString !== ''+api.PlatformType.AppStore && platformTypeString !== ''+api.PlatformType.PlayStore)
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
<div><dt>Tamer level:<dd>${escapeHtml(''+response.tamerLevel)}</dd></div>
</dl>`
	: `
<p>Your account’s data has been saved. A new transfer password has been generated for you:</p>
<dl>
<div><dt>Friend code (ID):<dd>${escapeHtml(payload.friendCode)}</dd></div>
<div><dt>Password:<dd>${escapeHtml(newPassword)}</dd></div>
<div><dt>Tamer name:<dd>${escapeHtml(response.tamerName)}</dd></div>
<div><dt>Tamer level:<dd>${escapeHtml(''+response.tamerLevel)}</dd></div>
</dl>
<p><strong>When you install the private server’s app, can use this friend code & password to transfer this account onto your phone/tablet.</strong></p>
<p>If you wish, you can also use this friend code & password to transfer your official account back into the official app.</p>`
}`
		} catch (e) { console.error(`[${now()}] Failed web migration:`, e); throw e } }
	})

	server.route({
		method: 'POST',
		path: '/api/migration/backupPassword',
		handler: async (request, h): Promise<api.MigrationBackupPassword.Response> => {
			const commonRequest = await getValidCommonRequest(request)
			const userId = request.auth.credentials.user!.userId
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
	})

	server.route({
		method: 'POST',
		path: '/api/user/login',
		options: {auth: 'login'},
		handler: async (request, h): Promise<api.UserLogin.Response> => {
			const commonRequest = await getValidCommonRequest(request, false)
			const payload = request.payload as api.UserLogin.Request
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
	})

	server.route({
		method: 'POST',
		path: '/api/user/getAll',
		handler: async (request, h): Promise<api.WithCommonResponse<api.UserGetAll.Response> | api.UserGetAll.Response> => {
			const commonRequest = await getValidCommonRequest(request, false)
			const userId = request.auth.credentials.user!.userId
			let tamerName
			let firstTutorialState = isUserCreateSession(request.auth.artifacts.sessionId!) ? api.FirstTutorialState.Download : api.FirstTutorialState.End
			let homeDigimonList = [-1, -1, -1, -1, -1, -1, -1]
			let partnerDigimonId = -1
			if (userId /*>= 0x02_00_00_00*/) {
				const [[row]] = await pool.execute<mysql.RowDataPacket[]>(
					'select `tamer_name`, `first_tutorial_state`, `partner_digimon_id`, `home_digimon_0`, `home_digimon_1`, `home_digimon_2`, `home_digimon_3`, `home_digimon_4`, `home_digimon_5`, `home_digimon_6` from `user` where `user_id` = ?',
					[
						userId,
					],
				)
				if (!row)
					throw digiriseError(api.ErrorNumber.UserNotExists)
				tamerName = row['tamer_name']
				firstTutorialState = row['first_tutorial_state']
				homeDigimonList = [0,1,2,3,4,5,6].map(i => row[`home_digimon_${i}`])
				partnerDigimonId = row['partner_digimon_id']
			}
			const response = {
				userData: {
					...await getUserData(pool, userId, commonRequest.languageCodeType ?? api.LanguageCodeType.Ja, firstTutorialState <= api.FirstTutorialState.Download, tamerName),
					homeDigimonList,
				},
			}
			response.userData.personal.userId = userId
			if (partnerDigimonId !== -1)
				response.userData.personal.partnerDigimonId = partnerDigimonId
			if (firstTutorialState === api.FirstTutorialState.End)
				return response
			else
				return {
					...response,
					commonResponse: {
						clearMissionIdList: [],
						clearChallengeIdList: [],
						tutorialInfo: {
							tutorialType: api.TutorialType.FirstTutorial,
							tutorialState: firstTutorialState,
						},
					},
				}
		}
	})

	server.route({
		method: 'POST',
		path: '/api/user/changeLanguage',
		handler: async (request, h): Promise<api.ChangeLanguage.Response> => {
			const commonRequest = await getValidCommonRequest(request, false)
			return {
				result: true,
			}
		}
	})

	server.route({
		method: 'POST',
		path: '/api/user/changeVoice',
		handler: async (request, h): Promise<api.ChangeVoice.Response> => {
			const commonRequest = await getValidCommonRequest(request, false)
			return {
				result: true,
			}
		}
	})

	server.route({
		method: 'POST',
		path: '/api/tutorial/progress',
		handler: async (request, h): Promise<api.WithCommonResponse<object>> => {
			const commonRequest = await getValidCommonRequest(request, false)
			const payload = request.payload as { tutorialInfo: api.TutorialInfo }
			// console.dir(payload, {depth: null})

			if (typeof payload.tutorialInfo !== 'object' || payload.tutorialInfo === null)
				throw new Error
			if (payload.tutorialInfo.tutorialType !== api.TutorialType.FirstTutorial)
				throw new Error
			if (typeof payload.tutorialInfo.tutorialState !== 'number')
				throw new Error

			let newTutorialState
			switch (payload.tutorialInfo.tutorialState) {
			case api.FirstTutorialState.Prologue:
				newTutorialState = api.FirstTutorialState.Download
				break
			case api.FirstTutorialState.Download:
				newTutorialState = api.FirstTutorialState.End
				break
			default:
				throw new Error
			}

			const userId = request.auth.credentials.user!.userId
			if (userId >= 0x02_00_00_00) {
				const [result] = await pool.execute<mysql.OkPacket | mysql.ResultSetHeader>(
					'update `user` set `first_tutorial_state` = ? where `user_id` = ? and `first_tutorial_state` in (?, ?)',
					[
						newTutorialState,
						userId,
						payload.tutorialInfo.tutorialState,
						newTutorialState,
					]
				)
				if (!result.affectedRows)
					throw new Error
			} else {
				throw new Error
			}

			return {
				commonResponse: {
					clearMissionIdList: [],
					clearChallengeIdList: [],
					tutorialInfo: {
						tutorialType: api.TutorialType.FirstTutorial,
						tutorialState: newTutorialState,
					},
				}
			}
		}
	})

	server.route({
		method: 'POST',
		path: '/api/home/login',
		handler: async (request, h): Promise<api.HomeLogin.Response> => {
			const commonRequest = await getValidCommonRequest(request)
			return {
				receivedLoginBonusList: []
			}
		}
	})

	server.route({
		method: 'POST',
		path: '/api/home/statusEvery',
		handler: async (request, h): Promise<api.HomeStatusEvery.Response> => {
			const commonRequest = await getValidCommonRequest(request)
			const userId = request.auth.credentials.user!.userId
			let saved
			if (userId < 0x02_00_00_00) {
				const [serverName, serverUserId] =
					!('languageCodeType' in commonRequest)
						? [servers.jp.apiUrlBase.match(/\/\/([^/]+)\//)![1]!, userId]
						: [servers.ww.apiUrlBase.match(/\/\/([^/]+)\//)![1]!, userId ^ 0x01_00_00_00]
				;[[saved]] = await pool.execute<mysql.RowDataPacket[]>(
					// 'select `home_statusEvery`, `new_password` from `legacy_accounts` where `server` = ? and `user_id` = ? and `consentFormItemData` is not null order by `last_attempt` desc limit 1',
					'select `user_getAll`, `home_statusEvery` from `legacy_accounts` where `server` = ? and `user_id` = ? and `user_getAll` is not null order by `last_attempt` desc limit 1',
					[
						serverName,
						serverUserId,
					],
				)
			}
			if (!saved)
				return homeStatusEvery
			let userHatchingCapsuleList: api.UserHatchingCapsule[]
			const json: string | null = saved['home_statusEvery']
			if (json != null) {
				const savedHomeStatusEvery: api.HomeStatusEvery.Response = JSON.parse(json)
				userHatchingCapsuleList = savedHomeStatusEvery.userHatchingCapsuleList
			} else {
				const savedUserGetAll: api.UserGetAll.Response = JSON.parse(saved['user_getAll'])
				userHatchingCapsuleList = savedUserGetAll.userData.userHatchingCapsuleList
			}
			// const newPassword: string | null = saved['new_password']
			// let informationList = []
			// if (newPassword) {
			// 	informationList.push({
			// 		informationId: int
			// 		category: InformationCategory
			// 		thumbnail: string
			// 		title: string
			// 		dispOrder: int
			// 		pickupOrder: int
			// 		isPickup: boolean
			// 		startDate: string
			// 		endDate: string
			// 		modifiedDate: string
			// 	})
			// }
			// return {
			// 	...savedHomeStatusEvery,
			// 	informationList,
			// 	unreceivedPresentCount: 0,
			// 	unreceivedMissionIds: [],
			// }
			return {
				...homeStatusEvery,
				userHatchingCapsuleList: userHatchingCapsuleList,
			}
		}
	})

	server.route({
		method: 'POST',
		path: '/api/home/statusIntervals',
		handler: async (request, h): Promise<api.HomeStatusIntervals.Response> => {
			const commonRequest = await getValidCommonRequest(request)
			return homeStatusIntervals
		}
	})

	server.route({
		method: 'POST',
		path: '/api/information/getList',
		handler: async (request, h): Promise<api.InformationGetList.Response> => {
			const commonRequest = await getValidCommonRequest(request)
			return {
				informationList: [],
				bannerIdList: [],
			}
		}
	})

	// server.route({
	// 	method: 'POST',
	// 	path: '/api/information/getDetail',
	// 	handler: async (request, h): Promise<api.InformationGetDetail.Response> => {
	// 		const commonRequest = await getValidCommonRequest(request)
	// 		return {description: ''}
	// 	}
	// })

	server.route({
		method: 'POST',
		path: '/api/challenge/top',
		handler: async (request, h): Promise<api.ChallengeTop.Response> => {
			const commonRequest = await getValidCommonRequest(request)
			return {
				challengeGroupList: [],
				endChallengeGroupIdList: [],
			}
		}
	})

	server.route({
		method: 'POST',
		path: '/api/sideMenu/getEvent',
		handler: async (request, h): Promise<api.SideMenuGetEvent.Response> => {
			const commonRequest = await getValidCommonRequest(request)
			return {
				raidEventInSessionList: [],
				scenarioEventInSessionList: [],
				bceInSessionList: [],
				mprInSessionList: [],
			}
		}
	})

	server.route({
		method: 'POST',
		path: '/api/present/top',
		handler: async (request, h): Promise<api.PresentTop.Response> => {
			const commonRequest = await getValidCommonRequest(request)
			return {
				presentList: [],
				socialPresentList: [],
				isPresentOver: false,
				isSocialOver: false,
			}
		}
	})

	server.route({
		method: 'POST',
		path: '/api/home/board',
		handler: async (request, h): Promise<api.HomeBoard.Response> => {
			const commonRequest = await getValidCommonRequest(request)
			const zeroLogObject = {
				count: 0,
				isNew: false,
				updatedAt: formatDate(),
			}
			return {
				logList: [],
				reliefRequest: zeroLogObject,
				friend: zeroLogObject,
				clan: zeroLogObject,
				clanCareRequest: zeroLogObject,
				helper: zeroLogObject,
			}
		}
	})

	server.route({
		method: 'POST',
		path: '/api/home/digimonEdit',
		handler: async (request, h): Promise<api.HomeDigimonEdit.Response> => {
			const commonRequest = await getValidCommonRequest(request)

			const payload = request.payload as api.HomeDigimonEdit.Request
			if (typeof payload.homeDigimonList !== 'object' || !(payload.homeDigimonList instanceof Array))
				throw new Error('invalid `homeDigimonList`')
			if (payload.homeDigimonList.length !== 7 || !payload.homeDigimonList.every(x => typeof x === 'number' && (x | 0) === x))
				throw new Error('invalid `homeDigimonList`')

			const userId = request.auth.credentials.user!.userId
			await pool.execute(
				'update `user` set `home_digimon_0` = ?, `home_digimon_1` = ?, `home_digimon_2` = ?, `home_digimon_3` = ?, `home_digimon_4` = ?, `home_digimon_5` = ?, `home_digimon_6` = ? where `user_id` = ?',
				[
					...payload.homeDigimonList,
					userId,
				]
			)
			return {
				result: true,
			}
		}
	})

	server.route({
		method: 'POST',
		path: '/api/digimon/setPartner',
		handler: async (request, h): Promise<api.DigimonSetPartner.Response> => {
			const commonRequest = await getValidCommonRequest(request)

			const payload = request.payload as api.DigimonSetPartner.Request
			if (typeof payload.userDigimonId !== 'number' || (payload.userDigimonId | 0) !== payload.userDigimonId)
				throw new Error('invalid `userDigimonId`')

			const userId = request.auth.credentials.user!.userId
			if (userId >= 0x02_00_00_00)
				return {result: false}
			else {
				await pool.execute(
					'update `user` set `partner_digimon_id` = ? where `user_id` = ?',
					[
						payload.userDigimonId,
						userId,
					]
				)
				return {
					result: true,
				}
			}
		}
	})

	server.route({
		method: 'POST',
		path: '/api/friend/top',
		handler: async (request, h): Promise<api.FriendTop.Response> => {
			const commonRequest = await getValidCommonRequest(request)
			return {
				friendList: [],
				approvalWaitingList: [],
				applyingList: [],
				approvalWaitingLimit: 30,
				applyingLimit: 30,
				// addCommuPoint: 0,
			}
		}
	})

	server.route({
		method: 'POST',
		path: '/api/raid/top',
		handler: async (request, h): Promise<api.RaidTop.Response> => {
			const commonRequest = await getValidCommonRequest(request)
			return {
				notJoinList: [],
				joinList: [],
				endList: [],
				userRaidCatalogList: [],
				latestRaidCatalogDate: '2022-02-14T15:00:00+09:00',
			}
		}
	})

	server.route({
		method: 'POST',
		path: '/api/raid/catalogTop',
		handler: async (request, h): Promise<api.RaidCatalogTop.Response> => {
			const commonRequest = await getValidCommonRequest(request)
			return {
				raidCatalogList: [],
			}
		}
	})

	server.route({
		method: 'POST',
		path: '/api/digimon/scrounge',
		handler: async (request, h): Promise<api.DigimonScrounge.Response> => {
			const commonRequest = await getValidCommonRequest(request)
			return {
				digimonList: [],
			}
		}
	})

	server.route({
		method: 'POST',
		path: '/api/raidRanking/scenarioDictionary',
		handler: async (request, h): Promise<api.RaidRankingScenarioDictionary.Response> => {
			const commonRequest = await getValidCommonRequest(request)
			return {
				dictionaryList: [],
			}
		}
	})

	server.route({
		method: 'POST',
		path: '/api/mission/top',
		handler: async (request, h): Promise<api.MissionTop.Response> => {
			const commonRequest = await getValidCommonRequest(request)
			return {
				missionProgressInfoList: [],
				notReceiveMissionIdList: [],
				// playingSpecialMissionId: 0,
			}
		}
	})

	server.route({
		method: 'POST',
		path: '/api/mission/complete',
		handler: async (request, h): Promise<api.MissionComplete.Response> => {
			const commonRequest = await getValidCommonRequest(request)
			if (![19, 21, 28].includes((request.payload as any).condition))
				console.log(`[${now()}]`, request.auth.credentials.user!.userId, request.path, request.payload)
			return {
				result: false
			}
		}
	})

	server.route({
		method: 'POST',
		path: '/api/weekly/top',
		handler: async (request, h): Promise<api.WeeklyTop.Response> => {
			const commonRequest = await getValidCommonRequest(request)
			return {
				weeklyProgressInfoList: [],
			}
		}
	})

	server.route({
		method: 'POST',
		path: '/api/weekly/timesInfo',
		handler: async (request, h): Promise<api.WeeklyTimesInfo.Response> => {
			const commonRequest = await getValidCommonRequest(request)
			return {
				weeklyQuestTimesInfoList: [],
			}
		}
	})

	server.route({
		method: 'POST',
		path: '/api/xlb/getTop',
		handler: async (request, h): Promise<api.XlbGetTop.Response> => {
			const commonRequest = await getValidCommonRequest(request)
			return {
				sectionList: [],
			}
		}
	})

	server.route({
		method: 'POST',
		path: '/api/shop/top',
		handler: async (request, h): Promise<api.ShopTop.Response> => {
			const commonRequest = await getValidCommonRequest(request)
			return {
				shopList: [],
				reloadPrizeList: [],
				limitedTimeEventList: [],
				isMaintenanceApi: true,
				maintenanceText: '販売は終了しました',
			}
		}
	})

	server.route({
		method: 'POST',
		path: '/api/gasha/top',
		handler: async (request, h): Promise<api.GashaTop.Response> => {
			const commonRequest = await getValidCommonRequest(request)
			return {
				gashaGroupList: [],
				userDigiruby: {
					paidDigiruby: 0,
					freeDigiruby: 0,
				},
				stepupGashaGroupList: [],
			}
		}
	})

	server.route({
		method: 'POST',
		path: '/api/gasha/getRate',
		handler: async (request, h): Promise<api.GashaGetRate.Response> => {
			const commonRequest = await getValidCommonRequest(request)
			const payload = request.payload as api.GashaGetRate.Request
			if (payload.gashaGroupId) {
				// use it
			} else if (payload.gashaIdList) {
				// use it
				// if at least one does not exist: ServerError
				// if at least one is not currently active: ExecuteOutOfPeriod
			} else {
				throw new Error
			}
			throw new Error
		}
	})

	server.route({
		method: 'POST',
		path: '/api/profile/top',
		handler: async (request, h): Promise<api.ProfileTop.Response> => {
			const commonRequest = await getValidCommonRequest(request)
			const userId = request.auth.credentials.user!.userId
			const response = {
				greetings: '',
				battleParkRankId: api.UserData.DefaultBattleParkRank,
				battleParkPoint: -1,
				clanName: '',
				friendCount: 0,
				battleParkLeagueType: -1,
				// battleParkLeagueVictoryCount: 0,
			}
			if (userId) {
				const [[row]] = await pool.execute<mysql.RowDataPacket[]>(
					'select `greetings` from `user` where `user_id` = ?',
					[
						userId,
					]
				)
				if (!row)
					throw new Error
				response.greetings = row['greetings']
				if (userId < 0x02_00_00_00) {
					const [serverName, serverUserId] =
						!('languageCodeType' in commonRequest)
							? [servers.jp.apiUrlBase.match(/\/\/([^/]+)\//)![1]!, userId]
							: [servers.ww.apiUrlBase.match(/\/\/([^/]+)\//)![1]!, userId ^ 0x01_00_00_00]
					const [[row]] = await pool.execute<mysql.RowDataPacket[]>(
						'select `profile_top` from `legacy_accounts` where `server` = ? and `user_id` = ? and `profile_top` is not null order by `last_attempt` desc limit 1',
						[
							serverName,
							serverUserId,
						],
					)
					if (row) {
						const savedResponse = JSON.parse(row['profile_top'])
						return {
							...savedResponse,
							greetings: response.greetings,
						}
					}
				}
			}
			return response
		}
	})

	server.route({
		method: 'POST',
		path: '/api/profile/edit',
		handler: async (request, h): Promise<api.ProfileEdit.Response> => {
			const commonRequest = await getValidCommonRequest(request)

			const payload = request.payload as api.ProfileEdit.Request
			if (typeof payload.name !== 'string')
				throw new Error('invalid `name`')
			if (typeof payload.greetings !== 'string')
				throw new Error('invalid `greetings`')

			if (!payload.name.length || payload.name.length > 10)
				throw digiriseError(api.ErrorNumber.UserNameCharacterOver)
			if (payload.name.match(/^\s+$/))
				throw digiriseError(api.ErrorNumber.NGWordInUserName)

			if (!payload.greetings.length || payload.greetings.length > 40)
				throw digiriseError(api.ErrorNumber.UserProfileCharacterOver)
			if (payload.greetings.match(/^\s+$/))
				throw digiriseError(api.ErrorNumber.NGWordInUserProfile)

			const userId = request.auth.credentials.user!.userId
			// if (userId >= 0x02_00_00_00) {
				await pool.execute(
					'update `user` set `tamer_name` = ?, `greetings` = ? where `user_id` = ?',
					[
						payload.name,
						payload.greetings,
						userId,
					]
				)
				return {
					result: true,
				}
			// }

			// return {
			// 	result: false,
			// }
		}
	})

	server.route({
		method: 'POST',
		path: '/api/dpoint/getPurchaseHistory',
		handler: async (request, h): Promise<api.DpointGetPurchaseHistory.Response> => {
			const commonRequest = await getValidCommonRequest(request)
			return {
				freeDigiruby: 0,
				purchaseDigiruby: 0,
				purchaseHistoryList: [],
			}
		}
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
