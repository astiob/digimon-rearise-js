import * as api from "../../digimon-rearise-bots/apitypes";
import NodeGit, {Tree} from "nodegit";
import crypto from "crypto";
import {masterRepositoryPath, resourceEncryptionKey, resourceRepositoryPath} from "../config.json";
import {DigimonBookMaster, MasterManifest, ResourceManifest} from "../../digimon-rearise-bots/master";
import {parseDate} from "../../digimon-rearise-bots/util";
import { Request, ResponseToolkit } from '@hapi/hapi'
import {getValidCommonRequest} from "../common/digi_utils";
import {promisify} from "util";
import zlib from 'zlib'
import {promises as fs} from "fs";
import {XorStream} from "../common/utils";
import * as path from "path";

export type SimpleLanguageTag = 'ja' | 'en' | 'ko' | 'zh'

const resourceRepository = NodeGit.Repository.open(resourceRepositoryPath)
const resourceDirectoryNames: { [lct in api.LanguageCodeType]: SimpleLanguageTag } = {
    [api.LanguageCodeType.Ja]: 'ja',
    [api.LanguageCodeType.En]: 'en',
    [api.LanguageCodeType.Ko]: 'ko',
    [api.LanguageCodeType.Zh]: 'zh',
}
async function resourceTree(): Promise<Tree> {
    const repo = await resourceRepository
    const commit = await repo.getBranchCommit('main')
    return commit.getTree()
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

export async function resourceVersion(language: api.LanguageCodeType | SimpleLanguageTag, tree?: Tree): Promise<string> {
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

export async function resourceCacheKey(language: api.LanguageCodeType | SimpleLanguageTag, tree?: Tree): Promise<string> {
    return versionToCacheKey(await resourceVersion(language, tree))
}

function cacheKey(manifest: {version: string}): string {
    return versionToCacheKey(manifest.version)
}

export async function GetGlobalVersionAssetManifestHandler (request: Request, responseHelper: ResponseToolkit) {
    const osType = request.params['osType']
    if (osType !== 'ios' && osType !== 'android')
        return responseHelper.response().code(404)

    const language = request.params['language']
    const resources = await getResources(language)
    if (!resources)
        return responseHelper.response().code(404)

    const manifestEntry = await resources.tree.getEntry(`${language}/asset/${osType}/manifest`)
    const manifestBlob = await manifestEntry.getBlob()
    const manifest: ResourceManifest = JSON.parse(manifestBlob.toString())
    if (request.params['cacheKey'] !== cacheKey(manifest))
        return responseHelper.response().code(404)

    return manifest
}

export async function GetJapanVersionAssetManifestHandler (request: Request, responseHelper: ResponseToolkit) {
    let resourceKind = request.params['resourceKind']
    if (resourceKind !== 'movie' && resourceKind !== 'sound')
        return responseHelper.response().code(404)

    const language = 'ja'
    const resources = (await getResources(language))!
    if (request.params['cacheKey'] !== await resourceCacheKey(language, resources.tree))
        return responseHelper.response().code(404)

    const manifestEntry = await resources.tree.getEntry(`${language}/${resourceKind}/manifest`)
    const manifestBlob = await manifestEntry.getBlob()
    return JSON.parse(manifestBlob.toString())
}

export async function GetGlobalVersionResourceFileHandler (request: Request, responseHelper: ResponseToolkit) {
    const path = request.params['path']
    if (path.indexOf('.') >= 0/* || path.substring(0, 1) === '/'*/)
        return responseHelper.response().code(404)

    const osType = request.params['osType']
    if (osType !== 'ios' && osType !== 'android')
        return responseHelper.response().code(404)

    const language = request.params['language']
    const resources = await getResources(language)
    if (!resources)
        return responseHelper.response().code(404)

    const manifestEntry = await resources.tree.getEntry(`${language}/asset/${osType}/manifest`)
    const manifestBlob = await manifestEntry.getBlob()
    const manifest: ResourceManifest = JSON.parse(manifestBlob.toString())
    if (request.params['cacheKey'] !== cacheKey(manifest))
        return responseHelper.response().code(404)

    for (const resource of manifest.resources) {
        if (path === resource.name.replace(/[^/]*$/, resource.hash)) {
            const handle = await fs.open(`${resources.path}asset/${osType}/${resource.name}`, 'r')
            return handle.createReadStream().pipe(new XorStream(Buffer.from(resourceEncryptionKey)))
        }
    }

    return responseHelper.response().code(404)
}

export async function GetGlobalVersionResourceFileHandler2 (req: Request, res: ResponseToolkit) {
    let path = req.params['path']
    let partIndex = undefined
    const m = path.match(/(^.*)\.(00[1-9]|0[1-9][0-9]|[1-9][0-9]{2})$/)
    if (m) {
        path = m[1]
        partIndex = +m[2]
    }

    if (path.indexOf('.') >= 0/* || path.substring(0, 1) === '/'*/)
        return res.response().code(404)

    let resourceKind = req.params['resourceKind']
    if ((resourceKind !== 'movie' || !partIndex) && (resourceKind !== 'sound' || partIndex))
        return res.response().code(404)

    const language = req.params['language']
    if (language !== 'ja') {
        const m2 = path.match(/^(en|jp)\/(.*)$/)
        if (!m2)
            return res.response().code(404)
        resourceKind = `${resourceKind}/${m2[1]}`
        path = m2[2]
    }

    const resources = await getResources(language)
    if (!resources)
        return res.response().code(404)

    if (req.params['cacheKey'] !== await resourceCacheKey(language, resources.tree))
        return res.response().code(404)

    const manifestEntry = await resources.tree.getEntry(`${language}/${resourceKind}/manifest`)
    const manifestBlob = await manifestEntry.getBlob()
    const manifest: ResourceManifest = JSON.parse(manifestBlob.toString())

    for (const resource of manifest.resources) {
        if (path === resource.name.replace(/[^/]*$/, resource.hash)) {
            if (partIndex && (partIndex - 1) * 4194304 >= resource.size)
                return res.response().code(404)
            // const handle = await fs.open(`${resources.path}${resourceKind}/${resource.name}`, 'r')
            // const stream = handle.createReadStream(partIndex ? {
            // 	start: (partIndex - 1) * 4194304,
            // 	end: partIndex * 4194304 - 1,
            // } : {})
            // return stream
            return res.file(`${resources.path}${resourceKind}/${resource.name}`, partIndex ? {
                start: (partIndex - 1) * 4194304,
                end: Math.min(partIndex * 4194304, resource.size) - 1,
                etagMethod: false,
            } : {etagMethod: false})
        }
    }

    return res.response().code(404)
}

export async function GetGlobalVersionAssetManifestHandler2 (req: Request, res: ResponseToolkit) {
    let resourceKind = req.params['resourceKind']
    if (!resourceKind.match(/^(movie|sound)\/(en|jp)$/))
        return res.response().code(404)

    const language = req.params['language']
    if (language === 'ja')
        return res.response().code(404)

    const resources = await getResources(language)
    if (!resources)
        return res.response().code(404)

    if (req.params['cacheKey'] !== await resourceCacheKey(language, resources.tree))
        return res.response().code(404)

    const manifestEntry = await resources.tree.getEntry(`${language}/${resourceKind}/manifest`)
    const manifestBlob = await manifestEntry.getBlob()
    return JSON.parse(manifestBlob.toString())
}

export async function GetGlobalVersionResourceFilePartHandler (request: Request, responseHelper: ResponseToolkit) {
    const m = request.params['partIndex'].match(/^00[1-9]|0[1-9][0-9]|[1-9][0-9]{2}$/)
    if (!m)
    return responseHelper.response().code(404)
    const partIndex = +m[0]

    const language = request.params['language']
    const resources = await getResources(language)
    if (!resources)
    return responseHelper.response().code(404)

    if (request.params['cacheKey'] !== await resourceCacheKey(language, resources.tree))
    return responseHelper.response().code(404)

    const handle = await fs.open(resources.path + 'builtin/m', 'r')
    const stat = await handle.stat()
    await handle.close()
    if ((partIndex - 1) * 4000000 >= stat.size)
    return responseHelper.response().code(404)
    // return handle.createReadStream({
    // 	start: (partIndex - 1) * 4000000,
    // 	end: partIndex * 4000000 - 1,
    // })
    return responseHelper.file(resources.path + 'builtin/m', {
    start: (partIndex - 1) * 4000000,
    end: Math.min(partIndex * 4000000, stat.size) - 1,
    etagMethod: false,
})
}

interface Masters {
    tree: Tree
    manifest: MasterManifest
}
const masterPath = path.resolve(__dirname, masterRepositoryPath)
export const masterRepository = NodeGit.Repository.open(masterRepositoryPath)
export const masterBranchNamesByCodeType = {
    [api.LanguageCodeType.Ja]: 'master',
    [api.LanguageCodeType.En]: 'en',
    [api.LanguageCodeType.Ko]: 'ko',
    [api.LanguageCodeType.Zh]: 'zh',
}
export const masterBranchNamesByDirectory: { [key: string]: string } & { [K in SimpleLanguageTag]: string } = {
    ja: 'master',
    en: 'en',
    ko: 'ko',
    zh: 'zh',
}

async function masterTree(language: api.LanguageCodeType | SimpleLanguageTag, cacheKey?: undefined): Promise<Tree>
async function masterTree(language: api.LanguageCodeType | string, cacheKey?: string): Promise<Tree | undefined>
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

export async function getMasters(language: api.LanguageCodeType | SimpleLanguageTag, cacheKey?: undefined): Promise<Masters>
export async function getMasters(language: api.LanguageCodeType | string, cacheKey?: string): Promise<Masters | undefined>
export async function getMasters(language: api.LanguageCodeType | string, cacheKey?: string): Promise<Masters | undefined> {
    const tree = await masterTree(language, cacheKey)
    if (!tree)
        return
    const manifestBlob = await tree.entryByName('master_manifest.json').getBlob()
    return {
        tree: tree,
        manifest: JSON.parse(manifestBlob.toString()),
    }
}

export async function masterVersion(language: api.LanguageCodeType | SimpleLanguageTag): Promise<string> {
    const masters = await getMasters(language)
    return masters.manifest.version
}

export async function masterCacheKey(language: api.LanguageCodeType | SimpleLanguageTag): Promise<string> {
    return versionToCacheKey(await masterVersion(language))
}


export async function allDigimonCodes(language: api.LanguageCodeType): Promise<string[]> {
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

const deflateRaw = promisify(zlib.deflateRaw)
export async function GetMasterDataHandler (request: Request, responseHelper: ResponseToolkit): Promise<object> {
    const masters = await getMasters(request.params['language'], request.params['cacheKey'])
    if (!masters)
        return responseHelper.response().code(404)
    else if (request.params['hashName'] === 'E3FE0CBF2BC630C7E996F15DE1DD32A9')
        return masters.manifest
    else {
        const master = masters.manifest.masters.find(m => m.hashName === request.params['hashName'])
        if (!master)
            return responseHelper.response().code(404)
        else {
            const name = master.masterName
            const blob = await masters.tree.entryByName(`${name}.json`).getBlob()
            const content = Buffer.from(JSON.stringify(JSON.parse(blob.toString())))
            return deflateRaw(content, {windowBits: 15, level: 9, memLevel: 9})
        }
    }
}