import crypto from 'crypto'
// import fs from 'fs'
import {promises as fs} from 'fs'
import rawGot from 'got'
import type * as got from 'got'
import type * as gotCore from 'got/dist/source/core'
import type * as http from 'http'
import type * as https from 'https'
import is from '@sindresorhus/is'
// import Random from 'random-js'
// import SocksProxyAgent from 'socks-proxy-agent'
import {CookieJar} from 'tough-cookie'
import tunnel from 'tunnel'
import {isDeepStrictEqual} from 'util'
import {v4 as uuidv4} from 'uuid'

import * as api from './apitypes'
import {caCertificatePath} from './config.json'
import {Masters, Server} from './server'
import {now} from './util'

const verbose = true

declare module 'http' {
	interface ClientRequest {
		_header: string
	}
}

declare module 'got/dist/source/as-promise/types' {
	namespace PromiseOnly {
		interface Options {
			encryptionKey?: string
			decryptedResponseType?: got.ResponseType
		}

		interface NormalizedOptions {
			encryptionKey?: string
			decryptedResponseType?: got.ResponseType
		}

		interface Hooks {
			beforeDecrypt?: ((response: got.Response<Buffer>) => (void | Promise<void>))[]
		}
	}
}

interface WrappedGotResponse {
	_response: got.Response<unknown>
}

export type ResponsePromise<T> = Promise<T & WrappedGotResponse>
export function stripResponse<T extends WrappedGotResponse>(foo: T): Omit<T, '_response'> {
	const unwrapped: Omit<T, '_response'> & Partial<WrappedGotResponse> = {...foo}
	delete unwrapped._response
	return unwrapped
}

function getBufferBody(options: gotCore.Options) {
	if (options.body) {
		if (is.string(options.body))
			return Buffer.from(options.body)
		else if (is.buffer(options.body))
			return options.body
	} else if (!options.form) {
		if (options.json)
			return Buffer.from(JSON.stringify(options.json))
		else
			return null
	}
	throw new TypeError('The `encryptionKey` option requires a string or Buffer `body` or `json`')
}

const _got = rawGot.extend({
	timeout: 10000,
	// dnsCache: true,
	hooks: {
		init: [
			(options: gotCore.Options) => {
				if (!options.encryptionKey)
					// throw new TypeError('The `encryptionKey` option is missing!')
					return
				if (options.isStream)
					throw new TypeError('The `encryptionKey` and `isStream` options are mutually exclusive')
				const body = getBufferBody(options)
				if (options.headers && options.headers['accept'])
					throw new TypeError('The `encryptionKey` option and the `Accept` header (' + options.headers['accept'] + ') are mutually exclusive')
					// delete options.headers.accept
				if (body !== null) {
					const paddedCipherIv = crypto.randomBytes(20)
					const cipher = crypto.createCipheriv('aes-256-cbc', options.encryptionKey, paddedCipherIv.slice(2, 18))
					options.body = Buffer.concat([paddedCipherIv, cipher.update(body), cipher.final()])
					delete options.json
				}
				if (options.responseType !== undefined)
					options.decryptedResponseType = options.responseType
				options.responseType = 'buffer'
			},
		],
		afterResponse: [
			async (response: got.Response<unknown>/*,
			       retryWithMergedOptions: (options: got.Options) => got.CancelableRequest<got.Response>*/) => {
				const {options} = response.request
				if (!options.encryptionKey)
					return response
				const typedResponse = response as got.Response<Buffer>
				for (const hook of (options.hooks.beforeDecrypt || []))
					await hook(typedResponse)
				const responseType = options.decryptedResponseType!
				options.responseType = responseType
				delete options.decryptedResponseType
				let decrypted
				// {"errorNumber":...} is sent unencrypted
				if (typedResponse.headers['content-type'] === 'application/json') {
					decrypted = typedResponse.body
					// TODO convert into exception
				} else if (typedResponse.headers['content-type'] === 'application/octet-stream'
				        || typedResponse.headers['content-type'] === 'binary/octet-stream') {
					const decipher = crypto.createDecipheriv('aes-256-cbc', options.encryptionKey, typedResponse.body.slice(2, 18))
					decrypted = Buffer.concat([decipher.update(typedResponse.body.slice(20)), decipher.final()])
				} else {
					// console.dir(typedResponse, {depth: null})
					await fs.writeFile('error.bin', typedResponse.body)
					await fs.writeFile('error.json', JSON.stringify(typedResponse.body))
					throw new TypeError(`Unexpected response Content-Type: ${typedResponse.headers['content-type']}. Response body dumped to error.bin & error.json.`)
				}
				const decryptedResponse: got.Response<unknown> = typedResponse
				if (responseType === 'json') {
					decryptedResponse.body = decrypted.length === 0 ? '' : JSON.parse(decrypted.toString())
				} else if (responseType === 'buffer') {
					decryptedResponse.body = decrypted
				} else if (responseType === 'text') {
					decryptedResponse.body = decrypted.toString(options.encoding)
				} else {
					decryptedResponse.body = decrypted
					throw new TypeError(`Unknown body type '${responseType}'`)
				}
				return decryptedResponse
			},
		],
	},
})

export interface User<ConstrainedLanguageCodeType extends api.LanguageCodeType> {
	osType: api.OsType
	adId: string
	userId: number
	uuid: string
	validationCode: string
	languageCodeType: ConstrainedLanguageCodeType
	deviceInfo?: api.UserDeviceInfo
	userAgent?: string | undefined
	countryCode?: string
	languageCode?: string
	timezoneOffset?: string
	userData?: api.UserData
	tutorialInfo?: api.TutorialInfo | undefined
	delay?: number
}

class ProcessTermination extends Error {}

const rejections = new Set<() => void>()
export function sleep(delay: number) {
	return new Promise<void>((resolve, reject) => {
		let timeout: ReturnType<typeof setTimeout>
		const wrappedReject = () => {
			// rejections.delete(wrappedReject)
			clearInterval(timeout)
			reject(new ProcessTermination())
		}
		timeout = setTimeout(() => {
			rejections.delete(wrappedReject)
			resolve()
		}, delay)
		rejections.add(wrappedReject)
	})
}

export function log(...args: any[]) {
	console.log(`[${now()}]`, ...args)
}

export function error(...args: any[]) {
	console.error(`[${now()}]`, ...args)
}

export class DigiriseError extends Error {
	readonly errorNumber: number | undefined
	constructor(readonly request: string, readonly response: any) {
		super(response.errorNumber
			? `Error fetching data from official server: ${response.errorNumber}`
			: 'Error fetching data from official server')
		this.errorNumber = response.errorNumber
	}
}

const base64Hooks = {
	master: {},
	resource: {
		beforeDecrypt: [
			(response: got.Response<Buffer>) => {
				response.body = Buffer.from(response.body.toString(), 'base64')
			},
		],
	},
}

const cacheEncryptionKeys = {
	master: Buffer.from('bn!Q4(z%3cuMqz)p|fNyWzg*zTmj9q+f'),
	resource: Buffer.from('fK%Bcy6EgzAQsR-a/LNDUt!cAZNG97a&'),
}

export class DigiriseSession<ConstrainedLanguageCodeType extends api.LanguageCodeType> {
	readonly #isSlim: boolean
	readonly #got: got.Got
	verbose: boolean
	appStatus: api.AppStatus.Response
	encryptionKey?: Buffer
	sessionId?: string
	lastLoginDay?: number

	private constructor(readonly server: Server<ConstrainedLanguageCodeType>, readonly user: User<ConstrainedLanguageCodeType>, isSlim: boolean, options?: got.ExtendOptions & {verbose?: boolean}) {
		this.server = server
		this.user = user
		this.#isSlim = isSlim
		this.verbose = options?.verbose ?? verbose
		let gotOptions = {...options}
		if (gotOptions)
			delete gotOptions.verbose
		this.#got = _got.extend({
			cookieJar: new CookieJar(),
			prefixUrl: server.apiUrlBase,
			...gotOptions,
		})
		this.appStatus = undefined as unknown as api.AppStatus.Response
	}

	static async create<ConstrainedLanguageCodeType extends api.LanguageCodeType>(server: Server<ConstrainedLanguageCodeType>, user: User<ConstrainedLanguageCodeType>, options?: got.ExtendOptions & {verbose?: boolean}) {
		// const ca = await fs.readFile(caCertificatePath)
		const session = new DigiriseSession(server, user, false, {
			// agent: {
			// 	https: tunnel.httpsOverHttp({
			// 		ca: [ca],
			// 		proxy: {
			// 			host: 'localhost',
			// 			port: 8889,
			// 		},
			// 	}) as https.Agent /* a lie required by got's typing */,
			// },
			...options,
		})
		await session.initialize()
		return session
	}

	static async createSlim<ConstrainedLanguageCodeType extends api.LanguageCodeType>(server: Server<ConstrainedLanguageCodeType>, user: User<ConstrainedLanguageCodeType>, options?: got.ExtendOptions & {verbose?: boolean}) {
		const session = new DigiriseSession(server, user, true, options)
		await session.initializeSlim()
		return session
	}

	get userData() {
		return this.user.userData!
	}

	get masters() {
		return this.server.masters[this.user.languageCodeType]
	}

	gotRaw(encryptionKey: Buffer, apiPath: string, options: got.Options & {isStream?: false, resolveBodyOnly?: false, responseType?: 'text'}): Promise<got.Response<string>>
	gotRaw<T>(encryptionKey: Buffer, apiPath: string, options: got.Options & {isStream?: false, resolveBodyOnly?: false, responseType: 'json'}): Promise<got.Response<T>>
	gotRaw(encryptionKey: Buffer, apiPath: string, options: got.Options & {isStream?: false, resolveBodyOnly?: false, responseType: 'buffer'}): Promise<got.Response<Buffer>>
	gotRaw(encryptionKey: Buffer, apiPath: string, options: got.Options & {isStream?: false, resolveBodyOnly: true, responseType?: 'text'}): Promise<string>
	gotRaw<T>(encryptionKey: Buffer, apiPath: string, options: got.Options & {isStream?: false, resolveBodyOnly: true, responseType: 'json'}): Promise<T>
	gotRaw(encryptionKey: Buffer, apiPath: string, options: got.Options & {isStream?: false, resolveBodyOnly: true, responseType: 'buffer'}): Promise<Buffer>
	async gotRaw(encryptionKey: Buffer, apiPath: string, options: any): Promise<any> {
		for (let i = 0; ; ++i) {
			if ((this.verbose || apiPath.includes('migration') || apiPath === 'friend/search') && options.method !== 'GET') {
				console.log(`[${now()}] >>`)
				console.dir({userId: this.user.userId, uuid: this.user.uuid, apiPath, request: options.json}, {depth: null})
			}
			const promise = this.#got(apiPath, {method: 'POST', ...options, encryptionKey})
			let cancel = false
			const wrappedCancel = () => {
				// rejections.delete(wrappedCancel)
				// if (apiPath === 'quest/start')
				// 	// server borks the historyId upon request cancel such that it can't be resumed later
					cancel = true
				// else
					promise.cancel()
			}
			rejections.add(wrappedCancel)
			try {
				const response = await promise
				// if (typeof response.body !== "object")
				// 	throw new DigiriseError(response.req!._header + JSON.stringify(options.json), response.body)
				if ((this.verbose || apiPath.includes('migration') || apiPath === 'friend/search') && options.method !== 'GET') {
					console.log(`[${now()}] <<`)
					console.dir({userId: this.user.userId, uuid: this.user.uuid, apiPath, response: response.body}, {depth: null})
				}
				if (cancel)
					throw new ProcessTermination
				return response
			} catch (e) {
				if (e instanceof _got.CancelError)
					throw new ProcessTermination
				if (e instanceof _got.TimeoutError && i < 6)
					continue
				console.error(`[${now()}] [${this.user.uuid}] Got error when ${options.method ?? 'POST'}ing ${apiPath}:`, e)
				throw e
			} finally {
				rejections.delete(wrappedCancel)
			}
		}
	}

	gotCacheManifest(kind: 'master' | 'resource', path: string) {
		const cacheKey = this.appStatus[`${kind}CacheKey` as `${typeof kind}CacheKey`]
		return this.gotRaw<any>(cacheEncryptionKeys[kind], `${cacheKey}/${path}?c=${cacheKey}`, {
			method: 'GET',
			responseType: 'json',
			resolveBodyOnly: true,
			prefixUrl: this.appStatus[kind + 'BaseUrl' as 'masterBaseUrl' | 'resourceBaseUrl'],
			headers: {
				'Cache-Control': 'no-cache',
				'X-Unity-Version': this.server.unityVersion,
				'User-Agent': this.user.userAgent ?? 'Dalvik/2.1.0 (Linux; U; Android 5.1.1; A5010 Build/LMY48Z)',
				'Accept-Encoding': 'gzip',
			},
			hooks: base64Hooks[kind],
		})
	}

	gotCache(kind: 'master' | 'resource', path: string) {
		const cacheKey = this.appStatus[`${kind}CacheKey` as `${typeof kind}CacheKey`]
		return this.gotRaw(cacheEncryptionKeys[kind], `${cacheKey}/${path}?c=${cacheKey}`, {
			method: 'GET',
			responseType: 'buffer',
			resolveBodyOnly: true,
			prefixUrl: this.appStatus[kind + 'BaseUrl' as 'masterBaseUrl' | 'resourceBaseUrl'],
			headers: {
				'Cache-Control': 'no-cache',
				'X-Unity-Version': this.server.unityVersion,
				'User-Agent': this.user.userAgent ?? 'Dalvik/2.1.0 (Linux; U; Android 5.1.1; A5010 Build/LMY48Z)',
				'Accept-Encoding': 'gzip',
			},
			hooks: base64Hooks[kind],
		})
	}

	async gotApi<T extends object = any>(apiPath: string, requestPayload?: object, options?: {maxAttempts?: number}): ResponsePromise<T> {
		// log(`Starting gotApi("${apiPath}", ...)`)
		// try {
		const requestBody = {
			commonRequest: {
				osType: this.user.osType,
				version: {
					appVersion: this.server.appVersion,
					// masterVersion: await this.masters.version,
					masterVersion: this.server.masterVersion,
					resourceVersion: this.server.resourceVersion,
				},
				...(
					this.user.languageCodeType !== api.LanguageCodeType.Ja
						? {languageCodeType: this.user.languageCodeType}
						: {}
				),
			},
			...requestPayload,
		}
		const requestId = uuidv4().replace(/-/g, '')
		const maxAttempts = options?.maxAttempts ?? 10  //apiPath.match(/^(quest\/start|tutorial\/progress)$/) ? 10 : 7
		await sleep(this.user.delay ?? 5000)
		for (let attempt = 1, backoff = 7000;;) {
			const response = await this.gotRaw<T | api.WithCommonResponse<T> | api.Error>(this.encryptionKey!, apiPath, {
				responseType: 'json',
				headers: {
					'Cache-Control': 'no-cache',
					'X-Unity-Version': this.server.unityVersion,
					'X-SID': this.sessionId,
					'Content-Type': 'application/octet-stream',
					'X-REQUEST-ID': requestId,
					'User-Agent': this.user.userAgent ?? 'Dalvik/2.1.0 (Linux; U; Android 5.1.1; A5010 Build/LMY48Z)',
					'Accept-Encoding': 'gzip',
				},
				json: requestBody,
			})
			// await fs.writeFile(file, JSON.stringify([
			// 	uuid,
			// 	response.timings.start,
			// 	response.timings.socket,
			// 	response.timings.lookup,
			// 	response.timings.connect,
			// 	response.timings.upload,
			// 	response.timings.response,
			// 	response.timings.end,
			// 	simpleActivities,
			// 	response.body,
			// ]) + '\n')
			if ('errorNumber' in response.body) {
				switch (response.body.errorNumber) {
				case api.ErrorNumber.DisconnectedSession:
					await this.userLogin(false, !this.#isSlim)
					continue
				case api.ErrorNumber.DayChanged:
					// TODO: figure out when this can happen
					await this.homeLogin()
					continue
				case api.ErrorNumber.ServerError:
					if (attempt < maxAttempts) {
						// const start = process.hrtime.bigint()
						// const remainingBackoff = backoff - Number((process.hrtime.bigint() - start) / 1000000n)
						// if (remainingBackoff > 0)
						// 	await sleep(remainingBackoff)
						console.log(`[${now()}] [${this.user.uuid}] Backing off attempt ${attempt}: ${backoff} ms...`)
						await sleep(backoff)
						// if (this.#isSlim) {
							await this.initializeSlim()
							// const oldUserData = {...this.userData, userItemList: [], userPluginList: [], userReadScenarioIdList: [], personal: undefined}
							// // oldUserData.userQuestList.sort((a, b) => a.questId - b.questId)
							// oldUserData.userQuestList.forEach(uq => uq.clearedEvaluationIdList = [])
							// // oldUserData.personal.staminaChangeTime = oldUserData.personal.staminaChangeTime.replace(/ /, 'T')
							// // if (!oldUserData.personal.staminaChangeTime.includes('+'))
							// // 	oldUserData.personal.staminaChangeTime += '+09:00'
							// oldUserData.userDigimonList.forEach(ud => { ud.friendshipPoint = 0; delete (ud as any).friendshipLevel })
							// oldUserData.userHatchingCapsuleList.forEach(uhc => uhc.endCoolingDate = '')
							// if (this.user.userData)
							// 	await this.userGetAll()
							// const newUserData = {...this.userData, userItemList: [], userPluginList: [], userReadScenarioIdList: [], personal: undefined}
							// newUserData.userQuestList.forEach(uq => uq.clearedEvaluationIdList = [])
							// newUserData.userDigimonList.forEach(ud => { ud.friendshipPoint = 0; delete (ud as any).friendshipLevel })
							// newUserData.userHatchingCapsuleList.forEach(uhc => uhc.endCoolingDate = '')
							// if (!isDeepStrictEqual(oldUserData, newUserData)) {
							// 	console.dir({old: oldUserData, new: newUserData}, {depth: null})
							// 	throw new Error('WTF')
							// }
						// } else {
						// 	delete this.user.userData
						// 	await this.initialize()
						// }
						attempt++
						backoff = Math.min(backoff * 7, 300000)
						continue
					}
					break
				}
				// log({
				// 	request: response.req._header + response.request.gotOptions.body,
				// 	response: response.body,
				// })
				// if (response.body.errorNumber === 1000005) {
				// }
				let header = response.requestUrl + '\n'
				for (const symbol of Object.getOwnPropertySymbols(response.request)) {
					if (symbol.description === 'request') {
						header = ((response.request as any)[symbol] as http.ClientRequest)._header
						break
					}
				}
				// console.log(response.statusCode)
				throw new DigiriseError(header + JSON.stringify(requestBody), response.body)
			}
			if ('commonResponse' in response.body)
				this.user.tutorialInfo = response.body.commonResponse.tutorialInfo
			return {...response.body, _response: response}
		}
		// } finally {
		// 	log(`Ending gotApi("${apiPath}", ...)`)
		// }
	}

	async initialize() {
		// await this.checkAppVersion()
		await this.checkAppStatus()
		if (this.user.userId) {
			await this.userLogin()
			// FIXME: order of userGetAll and checkMastersAndResources upon first launch?
			// await this.checkMastersAndResources(true)
			if (!this.user.tutorialInfo || this.user.tutorialInfo.tutorialType !== api.TutorialType.FirstTutorial) {
				await this.ensureHomeLogin()
				await this.homeStatusEvery()
			}
		}
	}

	async initializeSlim() {
		// await this.checkAppVersion()
		// if (this.verbose) {
			try {
				await this.checkAppStatus()
			} catch (e) {}
		// }
		if (this.user.userId) {
			await Promise.all([
				this.userLogin(true, false),
				// this.checkMastersAndResources(false),
			])
		}
	}

	async ensureHomeLogin() {
		if (this.notLoggedInToday())
			await this.homeLogin()
	}

	currentLoginDay() {
		const jstNow = Date.now() + 32400000
		return (jstNow - this.server.loginResetJstHour * 3600000) / 86400000 | 0
	}

	notLoggedInToday() {
		return this.lastLoginDay !== this.currentLoginDay()
	}

	async checkAppVersion() {
		const promise = rawGot(`https://play.google.com/store/apps/details?id=${this.server.androidPackageId}`)
		const wrappedCancel = () => {
			// rejections.delete(wrappedCancel)
			promise.cancel()
		}
		rejections.add(wrappedCancel)
		try {
			const response = await promise
			rejections.delete(wrappedCancel)
			this.server.appVersion = [...response.body.matchAll(/<span class="htlgb"><div class="IQ1z0d"><span class="htlgb">([^<]*)<\/span><\/div><\/span>/g)][3]![1]!
		} catch (e) {
			if (e instanceof _got.CancelError)
				throw new ProcessTermination()
			throw e
		}
	}

	async checkAppStatus() {
		const requestBody = {
			commonRequest: {
				osType: this.user.osType,
				version: {
					appVersion: this.server.appVersion,
					masterVersion: '',
					resourceVersion: '',
				},
				...(
					this.user.languageCodeType !== api.LanguageCodeType.Ja
						? {languageCodeType: this.user.languageCodeType}
						: {}
				),
			},
			userId: this.user.userId,
		}
		const response = await this.gotRaw<api.AppStatus.Response | api.Error>(Buffer.from('KjS.$O,;+i_qVe|aTBrOd%N|u\\#dR!+9'), 'app/status', {
			responseType: 'json',
			headers: {
				'Content-Type': 'application/octet-stream',
				'Cache-Control': 'no-cache',
				'X-Unity-Version': this.server.unityVersion,
				'X-REQUEST-ID': uuidv4().replace(/-/g, ''),
				'User-Agent': this.user.userAgent ?? 'Dalvik/2.1.0 (Linux; U; Android 5.1.1; A5010 Build/LMY48Z)',
				'Accept-Encoding': 'gzip',
			},
			json: requestBody,
		})
		const json = JSON.stringify(response.body)
		const hash = crypto.createHash('md5')
		hash.update(json)
		const jsonHash = hash.digest('hex')
		await fs.writeFile(jsonHash, json, {flag: 'r+'})
		if ('errorNumber' in response.body) {
			let header = response.requestUrl + '\n'
			for (const symbol of Object.getOwnPropertySymbols(response.request)) {
				if (symbol.description === 'request') {
					header = ((response.request as any)[symbol] as http.ClientRequest)._header
					break
				}
			}
			throw new DigiriseError(header + JSON.stringify(requestBody), response.body)
		}
		this.appStatus = response.body
	}

	async userLogin(supplyAdId: boolean = true, loadUserData: boolean = true) {
		const requestBody = {
			commonRequest: {
				osType: this.user.osType,
				version: {
					appVersion: this.server.appVersion,
					// masterVersion: this.sessionId ? await this.masters.version : '',
					masterVersion: this.sessionId ? this.server.masterVersion : '',
					resourceVersion: this.sessionId ? this.server.resourceVersion : '',
				},
				...(
					this.user.languageCodeType !== api.LanguageCodeType.Ja
						? {languageCodeType: this.user.languageCodeType}
						: {}
				),
			},
			uuid: this.user.uuid,
			userId: this.user.userId,
			adId: supplyAdId ? this.user.adId : '',
			isDevelopmentMode: true,
			isRoot: true,
			validationCode: this.user.validationCode,
			deviceInfo: this.user.deviceInfo ?? {
				operatingSystem: 'Android OS 5.1.1 / API-22 (LMY48Z/eng.se.infra.20190315.173723)',
				deviceModel: 'OnePlus A5010',
			},
			...(
				this.user.languageCodeType !== api.LanguageCodeType.Ja
					? {
						countryCode: this.user.countryCode ?? 'GB',
						languageCode: this.user.languageCode ?? 'EN',
						timezoneOffset: this.user.timezoneOffset ?? '09:00:00',
					}
					: {}
			),
		}
		const response = await this.gotRaw<api.UserLogin.Response | api.Error>(Buffer.from('KjS.$O,;+i_qVe|aTBrOd%N|u\\#dR!+9'), 'user/login', {
			responseType: 'json',
			headers: {
				'Content-Type': 'application/octet-stream',
				'Cache-Control': 'no-cache',
				'X-Unity-Version': this.server.unityVersion,
				'X-REQUEST-ID': uuidv4().replace(/-/g, ''),
				'User-Agent': this.user.userAgent ?? 'Dalvik/2.1.0 (Linux; U; Android 5.1.1; A5010 Build/LMY48Z)',
				'Accept-Encoding': 'gzip',
			},
			json: requestBody,
		})
		if ('errorNumber' in response.body) {
			let header = response.requestUrl + '\n'
			for (const symbol of Object.getOwnPropertySymbols(response.request)) {
				if (symbol.description === 'request') {
					header = ((response.request as any)[symbol] as http.ClientRequest)._header
					break
				}
			}
			throw new DigiriseError(header + JSON.stringify(requestBody), response.body)
		}
		this.encryptionKey = Buffer.from(response.body.encryptionKey)
		this.sessionId = response.body.sessionId
		if (response.body.isLoadNecessary)
			delete this.user.userData
		if (loadUserData && !this.user.userData)
			await this.userGetAll()
	}

	async userCreate() {
		const requestBody = {
			commonRequest: {
				osType: this.user.osType,
				version: {
					appVersion: this.server.appVersion,
					masterVersion: '',
					resourceVersion: '',
				},
				...(
					this.user.languageCodeType !== api.LanguageCodeType.Ja
						? {languageCodeType: this.user.languageCodeType}
						: {}
				),
			},
			uuid: this.user.uuid,
			name: 'Beep',
			platformType: this.user.osType === api.OsType.iOS ? api.PlatformType.AppStore : api.PlatformType.PlayStore,
			uniqueDeviceId: Math.floor(Math.random() * 9000000000000000) + 1000000000000000 + '',
			adId: this.user.adId,
			isDevelopmentMode: true,
			isRoot: true,
			validationCode: this.user.validationCode,
			deviceInfo: this.user.deviceInfo ?? {
				operatingSystem: 'Android OS 5.1.1 / API-22 (LMY48Z/eng.se.infra.20190315.173723)',
				deviceModel: 'OnePlus A5010',
			},
			...(
				this.user.languageCodeType !== api.LanguageCodeType.Ja
					? {
						countryCode: 'GB',
						languageCode: 'EN',
						timezoneOffset: '09:00:00',
						consentFormItemData: [
							{isAccepted: false, itemType: 1, version: 0},
							{isAccepted: false, itemType: 2, version: 0},
						],
						isAliveGdprConsentForm: true,
					}
					: {
						currencyUnit: 'JPY',
					}
			),
		}
		const response = await this.gotRaw<api.WithCommonResponse<api.UserCreate.Response> | api.Error>(Buffer.from('KjS.$O,;+i_qVe|aTBrOd%N|u\\#dR!+9'), 'user/create', {
			responseType: 'json',
			headers: {
				'Content-Type': 'application/octet-stream',
				'Cache-Control': 'no-cache',
				'X-Unity-Version': this.server.unityVersion,
				'X-REQUEST-ID': uuidv4().replace(/-/g, ''),
				'User-Agent': this.user.userAgent ?? 'Dalvik/2.1.0 (Linux; U; Android 5.1.1; A5010 Build/LMY48Z)',
				'Accept-Encoding': 'gzip',
			},
			json: requestBody,
		})
		if ('errorNumber' in response.body) {
			let header = response.requestUrl + '\n'
			for (const symbol of Object.getOwnPropertySymbols(response.request)) {
				if (symbol.description === 'request') {
					header = ((response.request as any)[symbol] as http.ClientRequest)._header
					break
				}
			}
			throw new DigiriseError(header + JSON.stringify(requestBody), response.body)
		}
		this.encryptionKey = Buffer.from(response.body.encryptionKey)
		this.sessionId = response.body.sessionId
		this.user.userId = response.body.userId
		this.user.tutorialInfo = response.body.commonResponse.tutorialInfo
		await this.userGetAll()
	}

	async migrationRestorePasswordRaw(requestBody: api.WithCommonRequest<api.MigrationRestorePassword.Request>): Promise<api.MigrationRestorePassword.Response | api.Error> {
		const response = await this.gotRaw<api.MigrationRestorePassword.Response | api.Error>(Buffer.from('KjS.$O,;+i_qVe|aTBrOd%N|u\\#dR!+9'), 'migration/restorePassword', {
			responseType: 'json',
			headers: {
				'Content-Type': 'application/octet-stream',
				'Cache-Control': 'no-cache',
				'X-Unity-Version': this.server.unityVersion,
				'X-REQUEST-ID': uuidv4().replace(/-/g, ''),
				'User-Agent': this.user.userAgent ?? 'Dalvik/2.1.0 (Linux; U; Android 5.1.1; A5010 Build/LMY48Z)',
				'Accept-Encoding': 'gzip',
			},
			json: requestBody,
		})
		if (!('errorNumber' in response.body)) {
			this.encryptionKey = Buffer.from(response.body.encryptionKey)
			this.sessionId = response.body.sessionId
			this.user.userId = response.body.userId
			delete this.user.tutorialInfo
			delete this.user.userData
		}
		return response.body
	}

	async checkMastersAndResources(throwOnMasterVersionMismatch: boolean) {
		const [
			masterManifest,
			assetManifest,
			// soundManifest,
			// movieManifest,
			cachedMasterVersion,
		] = await Promise.all([
			this.gotCacheManifest('master', 'E3FE0CBF2BC630C7E996F15DE1DD32A9'),
			this.gotCacheManifest('resource', 'asset/android/7f5cb74af5d7f4b82200738fdbdc5a45'),
			// this.gotCacheManifest('resource', 'sound/7f5cb74af5d7f4b82200738fdbdc5a45'),
			// this.gotCacheManifest('resource', 'movie/7f5cb74af5d7f4b82200738fdbdc5a45'),
			this.masters.version,
		])
		if (throwOnMasterVersionMismatch && masterManifest.version.replace(/ en.*$/, '') !== cachedMasterVersion)
			throw new Error(`Outdated master cache: we have ${cachedMasterVersion} but server has ${masterManifest.version}`)
		this.server.masterVersion = masterManifest.version
		this.server.resourceVersion = assetManifest.version
		// TODO
	}

	async userGetAll(): Promise<void> {
		this.user.userData = (await this.gotApi('user/getAll')).userData
	}

	homeLogin(): ResponsePromise<api.HomeLogin.Response> {
		this.lastLoginDay = this.currentLoginDay()
		return this.gotApi('home/login')
	}

	async homeStatusEvery(): ResponsePromise<api.HomeStatusEvery.Response> {
		const response = await this.gotApi('home/statusEvery')
		for (const scenarioEventInSession of response.scenarioEventInSessionList)
			scenarioEventInSession.extensionData = JSON.parse(scenarioEventInSession.extensionData)
		return response
	}

	homeStatusIntervals(): ResponsePromise<api.HomeStatusIntervals.Response> {
		return this.gotApi('home/statusIntervals')
	}

	async homeDigimonEdit(homeDigimonList: [number, number, number, number, number, number, number]): Promise<boolean> {
		return (await this.gotApi('home/digimonEdit', {
			homeDigimonList,
		})).result
	}

	async homeTalkToVisitor(visitedDigimonOwnerId: number): Promise<boolean> {
		return (await this.gotApi('home/talkToVisitor', {
			visitedDigimonOwnerId,
		})).result
	}

	async digimonScrounge(): Promise<{
		userDigimonId: number
		scroungeId: number
		endTime: string
	}[]> {
		return (await this.gotApi('digimon/scrounge')).digimonList
	}

	async digimonCare(userDigimonId: number, useItemIdList: number[]): Promise<boolean> {
		return (await this.gotApi('digimon/care', {
			userDigimonId,
			useItemIdList,
		})).result
	}

	async digimonEvolve(userDigimonId: number): Promise<boolean> {
		return (await this.gotApi('digimon/evolve', {
			userDigimonId,
		})).result
	}

	async digimonSetPartner(userDigimonId: number): Promise<boolean> {
		return (await this.gotApi('digimon/setPartner', {
			userDigimonId,
		})).result
	}

	async digimonLock(userDigimonId: number, lockType: number): Promise<boolean> {
		return (await this.gotApi('digimon/lock', {
			userDigimonId,
			lockType,
		})).result
	}

	async digimonPart(userDigimonIdList: number[]): Promise<void> {
		for (let i = 0; i < userDigimonIdList.length; i += 10) {
			await this.gotApi('digimon/part', {
				userDigimonIdList: userDigimonIdList.slice(i, i + 10),
			})  // result: true
		}
	}

	async digimonReinforcement(userDigimonId: number, bit: number): Promise<boolean> {
		return (await this.gotApi('digimon/reinforcement', {
			targetDigimon: {
				userDigimonId,
				bit,
			},
		})).result
	}

	async digimonTeamEdit(userTeamList: api.DigimonTeamEdit.Request['userTeamList']): Promise<boolean> {
		return (await this.gotApi('digimon/teamEdit', {
			userTeamList,
		})).result
	}

	async digimonTraining(userDigimonId: number,
	                      trainingList: {limitbreakId: number, trainingIdList: number[]}[]): Promise<boolean> {
		return (await this.gotApi('digimon/training', {
			targetDigimon: {
				userDigimonId,
				trainingList,
			},
		})).result
	}

	sideMenuGetEvent(): ResponsePromise<{
		raidEventInSessionList: api.RaidEventInSession[]
		scenarioEventInSessionList: api.ScenarioEventInSession[]
	}> {
		return this.gotApi('sideMenu/getEvent')
	}

	async weeklyTimesInfo(): Promise<{
		weeklySectionId: number,
		weeklyQuestId: number,
		count: number,
	}[]> {
		return (await this.gotApi('weekly/timesInfo')).weeklyQuestTimesInfoList
	}

	async itemComposeTrainingItem(composeItemList: {itemId: number, num: number}[]): Promise<boolean> {
		return (await this.gotApi('item/composeTrainingItem', {
			composeItemList,
		})).result
	}

	async pluginStrengthen(targetUserPlugin: {
		baseUserPluginId: number
		strengthenList: {
			itemId: number
			materialUserPluginIdList: number[]
		}[]
	}): Promise<boolean> {
		return (await this.gotApi('plugin/strengthen', {
			targetUserPlugin,
		})).result
	}

	async pluginSell(userPluginIdList: number[]): Promise<boolean> {
		return (await this.gotApi('plugin/sell', {
			userPluginIdList,
		})).result
	}

	questReady(questId: number, questType: number) {
		return this.gotApi('quest/ready', {
			questId,
			questType,
		})  // helperList
	}

	async questStart(request: api.QuestStart.Request): ResponsePromise<api.QuestStart.Response> {
		const response = await this.gotApi('quest/start', request)
		for (const teamDigimon of response.teamList) {
			const userDigimon = this.userData.userDigimonList.find(ud => ud.userDigimonId === teamDigimon.userDigimonId)
			if (userDigimon) {
				userDigimon.moodValue = teamDigimon.moodValue
				userDigimon.lastCareTime = teamDigimon.lastCareTime
			}
		}
		return response
	}

	questStaminaRecover(staminaRecoverType: number): ResponsePromise<{afterStamina: number}> {
		return this.gotApi('quest/staminaRecover', {
			staminaRecoverType,
		})
	}

	scenarioEventMaster(eventId: number) {
		return this.gotApi('scenarioEvent/master', {
			eventId,
		})
	}

	scenarioEventTop(eventId: number) {
		return this.gotApi('scenarioEvent/top', {
			eventId,
		})
	}

	scenarioEventStatus(eventId: number, questId: number) {
		return this.gotApi('scenarioEvent/status', {
			eventId,
			questId,
		})
	}

	scenarioEventGashaRoll(eventId: number, rollCount: number): ResponsePromise<{
		prizeList: api.GashaEventResult[]
	}> {
		return this.gotApi('scenarioEvent/gashaRoll', {
			eventId,
			rollCount,
		})
	}

	gashaTop(): ResponsePromise<{
		gashaGroupList: {
			gashaGroupId: number
			dispOrder: number
			gashaType: number
			pickupList: number[]
			topList: number[]
			bannerAsset: string
			emissionRateAsset: string
			endDate: string
			gashaList: {
				gashaId: number
				name: string
				costType: number
				costAmount: number
				demoAsset: string
			}[]
		}[]
		stepupGashaGroupList: unknown[]
		userDigiruby: {
			paidDigiruby: number
			freeDigiruby: number
		}
	}> {
		return this.gotApi('gasha/top')
	}

	gashaGetRate(gashaGroupId: number, gashaIdList: number[]): ResponsePromise<api.GashaGetRate.Response> {
		return this.gotApi('gasha/getRate', {
			gashaGroupId,
			gashaIdList,
		})
	}

	gashaRoll(gashaId: number): ResponsePromise<api.GashaRoll.Response> {
		return this.gotApi('gasha/roll', {
			gashaId,
		})
	}

	informationGetList(): ResponsePromise<{
		informationList: api.Information[]
		bannerIdList: number[]
	}> {
		return this.gotApi('information/getList')
	}

	async informationGetDetail(informationId: number): Promise<string> {
		return (await this.gotApi('information/getDetail', {
			informationId,
		})).description
	}

	raidTop(): ResponsePromise<{
		notJoinList: api.RaidInfo[]
		joinList: api.RaidInfo[]
		endList: api.RaidInfo[]
		userRaidCatalogList: {
			raidId: number
			reachLevel: number
		}[]
		latestRaidCatalogDate: string
	}> {
		return this.gotApi('raid/top')
	}

	async raidCatalogTop(): Promise<{
		raidId: number
		dna: number
		bodyAsset: string
		textAsset: string
		digimonId: number
		raidLevelAndBattleIdMapList: {
			level: number
			battleId: number
			costStamina: number
			itemIdList: number[]
			isOverlapped: boolean
			firstPrize: api.PrizeInfo
			scenarioId: number
		}[]
	}[]> {
		return (await this.gotApi('raid/catalogTop')).raidCatalogList
	}

	async raidGetDetailInfo(uniqueRaidId: number): ResponsePromise<{
		hp: number
		defaultHp: number
		startDate: string
		joinCount: number
		isRescued: boolean
		memberList: api.RaidMember[]
		raidEventBanner: api.RaidEventBanner[]
		canReceiveReward: boolean
	}> {
		const info = await this.gotApi('raid/getDetailInfo', {
			uniqueRaidId,
		})
		info.raidEventBanner.extensionData = JSON.parse(info.raidEventBanner.extensionData)
		return info
	}

	raidStart(uniqueRaidId: number,
	          digimonParameterList: api.BattleLogParameterInfo[],
	          partnerDigimonParameter: api.BattleLogParameterInfo,
	          slayerIdList: number[],
	          resumeInfo: any,
	          teamId: number) {
		return this.gotApi('raid/start', {
			uniqueRaidId,
			digimonParameterList,
			partnerDigimonParameter,
			slayerIdList,
			resumeInfo: JSON.stringify(resumeInfo),
			teamId,
		})
	}

	raidReceivePrize(uniqueRaidId: number): ResponsePromise<{
		joinCount: number
		rank: number
		prizeItemList: {
			raidRewardType: number
			groupId: number
			sequence: number
			dispOrder: number
			prizeInfoList: api.PrizeInfo[]
			increasedAmount: number
		}[]
		memberList: {
			userId: number
			tamerName: string
			tamerLevel: number
			greetings: string
			lastLogin: string
			relationshipType: number
			isClanMember: boolean
			joinCount: number
			damage: number
			digimon: api.BattleLogParameterInfo
		}[]
		currentRaidEventPointTotal: number
		earnedRaidEventPoint: number
		canReceivedRaidEventPoint: boolean
		slayerIdList: number[]
		isRaidCatalogFirstClear: boolean
	}> {
		return this.gotApi('raid/receivePrize', {
			uniqueRaidId,
		})
	}

	raidGetEventReward(eventId: number): ResponsePromise<{
		allRewardList: api.RaidEventReward[]
		userRewardList: api.RaidEventReward[]
	}> {
		return this.gotApi('raid/getEventReward', {
			eventId,
		})
	}

	bp2Top() {
		return this.gotApi('bp2/top')
	}

	bp2Start(digimonParameterList: api.BattleLogParameterInfo[],
	         teamId: number,
	         resumeInfo: any) {
		return this.gotApi('bp2/start', {
			digimonParameterList,
			teamId,
			resumeInfo: JSON.stringify(resumeInfo),
		})
	}

	ecClear(request: api.EcClear.Request): ResponsePromise<api.EcClear.Response> {
		return this.gotApi('ec/clear', request)
	}

	ecResume(historyId: number): ResponsePromise<api.EcResume.Response> {
		return this.gotApi('ec/resume', {
			historyId,
		})
	}

	ecReturn(ecHistoryId: number = 0): ResponsePromise<api.EcReturn.Response> {
		return this.gotApi('ec/return', {
			ecHistoryId,
		})
	}

	ecStart(request: api.EcStart.Request): ResponsePromise<api.EcStart.Response> {
		return this.gotApi('ec/start', request)
	}

	ecTop(): ResponsePromise<api.EcTop.Response> {
		return this.gotApi('ec/top')
	}

	mprTop(mprId: number): ResponsePromise<api.MprTop.Response> {
		return this.gotApi('mpr/top', {
			mprId,
		})
	}

	async tutorialProgress(tutorialType: api.TutorialType, tutorialState: number): Promise<number> {
		return (await this.gotApi<api.WithCommonResponse<object>>('tutorial/progress', {
			tutorialInfo: {
				tutorialType,
				tutorialState,
			},
		})).commonResponse.tutorialInfo!.tutorialState
	}

	missionTop(): ResponsePromise<api.MissionTop.Response> {
		return this.gotApi('mission/top')
	}

	missionReceive(receiveMissionIdList: number[]): ResponsePromise<api.MissionReceive.Response> {
		return this.gotApi('mission/receive', {
			receiveMissionIdList,
		})
	}
}

function extend<T>(array1: T[], array2: T[]) {
	for (const value of array2)
		array1.push(value)
}

export function itemCount(userData: api.UserData, itemId: number | undefined) {
	const userItem = userData.userItemList.find(item => item.itemId === itemId)
	return userItem ? userItem.count : 0
}

export async function hasSpecificEvolutionCode(masters: Masters, digimonId: number) {
	let evolution
	const evolveMaster = await masters.evolve
	while (evolution = evolveMaster.get(digimonId)) {
		if ((await masters.evolveUseItem).get(evolution.evolveUseItemId)!.some(ui => ui.itemId >= 10100))
			return true
		digimonId = evolution.nextDigimonId
	}
	return false
}

// 598678957
// old: YWJpMmcPVRWm
// new: twRTECR6uyyf
export const mainJpUser: User<api.LanguageCodeType.Ja> = {
	osType: api.OsType.Android,
	adId: 'f5c8b10e-e85f-4131-8216-7710d807f4ff',
	userId: 3838353,
	uuid: '21f626eb2f4643e98ee5b840af07e813',
	validationCode: '8cf07ff89c25d55d9c16f5c1c036a29e',
	languageCodeType: api.LanguageCodeType.Ja,
	// userData: JSON.parse(fs.readFileSync('0054bac9c220839cc732093fcad7968f', 'utf8')),
	delay: 0,
}

export const searchGlobalUser: User<api.LanguageCodeType.Ko> = {
	osType: api.OsType.Android,
	adId: 'f5c8b10e-e85f-4131-8216-7710d807f4ff',
	userId: 7261225,
	uuid: '6210a00a65ec423d801e94cf6e3804cc',
	validationCode: '8cf07ff89c25d55d9c16f5c1c036a29e',
	languageCodeType: api.LanguageCodeType.Ko,
	delay: 0,
}

let _keepGoing = true, killedBySignal: NodeJS.Signals | undefined
export function keepGoing(): boolean {
	return _keepGoing
}
function bail() {
	_keepGoing = false
	for (const reject of rejections)
		reject()
}
function handleSignal(signal: NodeJS.Signals) {
	killedBySignal = signal
	bail()
}

export async function propagateFailure<T>(promise: Promise<T>): Promise<unknown> {
	try {
		await promise
	} catch (e) {
		if (!(e instanceof ProcessTermination)) {
			bail()
			return e
		}
	}
	return
}

export async function run(createPromises: () => Promise<unknown>[] | [Promise<unknown>[], () => Promise<unknown>[]] | Promise<Promise<unknown>[]> | Promise<[Promise<unknown>[], () => Promise<unknown>[]]>): Promise<void> {
	process.on('SIGHUP', handleSignal)
	process.on('SIGINT', handleSignal)
	process.on('SIGTERM', handleSignal)

	// const file = fs.openSync(`${new Date().toISOString()}-${process.pid}`, 'ax')

	try {
		const createdPromises = await createPromises()
		let promises: Promise<unknown>[]
		let finallyCreatePromises: () => Promise<unknown>[] = () => []
		if (createdPromises.length === 2 && createdPromises[0] instanceof Array)
			[promises, finallyCreatePromises] = createdPromises as [Promise<unknown>[], () => Promise<unknown>[]]
		else
			promises = createdPromises as Promise<unknown>[]
		const errors = await Promise.all(promises.map(propagateFailure))
		// console.log(`All promises finished. Errors: ${errors}`)
		const finalErrors = await Promise.all(finallyCreatePromises().map(propagateFailure))
		// fs.fdatasyncSync(file)
		// fs.closeSync(file)
		process.off('SIGHUP', handleSignal)
		process.off('SIGINT', handleSignal)
		process.off('SIGTERM', handleSignal)
		if (killedBySignal)
			process.kill(process.pid, killedBySignal)
		else {
			const ne = errors.filter(e => e).length
			if (ne > 1 || ne + finalErrors.filter(e => e).length > 1) {
				errors.forEach(console.error)
				finalErrors.forEach(console.error)
				throw new Error('Multiple errors (see above)')
			} else {
				const error = errors.find(e => e) || finalErrors.find(e => e)
				if (error)
					throw error
			}
		}
	} catch (e) {
		console.error(e)
	}
}
