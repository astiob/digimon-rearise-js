import {promises as fs} from 'fs'
import NodeGit from 'nodegit'
import PLazy from 'p-lazy'

import {LanguageCodeType} from './apitypes'
import {masterRepositoryPath, resourceDecodedPath} from './config.json'
import * as master from './master'
// import {now} from './util'

const repository = NodeGit.Repository.open(masterRepositoryPath)
type BranchName = 'master' | 'en' | 'ko' | 'zh'
const commits = {
	master: PLazy.from(() => repository.then(r => r.getBranchCommit('master'))),
	en: PLazy.from(() => repository.then(r => r.getBranchCommit('en'))),
	ko: PLazy.from(() => repository.then(r => r.getBranchCommit('ko'))),
	zh: PLazy.from(() => repository.then(r => r.getBranchCommit('zh'))),
}
const trees = {
	master: PLazy.from(() => commits.master.then(c => c.getTree())),
	en: PLazy.from(() => commits.en.then(c => c.getTree())),
	ko: PLazy.from(() => commits.ko.then(c => c.getTree())),
	zh: PLazy.from(() => commits.zh.then(c => c.getTree())),
}
function readResourceFile(relativePath: string): Promise<string> {
	return fs.readFile(`${resourceDecodedPath}/${relativePath}`, {
		encoding: 'utf8',
	})
}
async function parseDigestToPathMap(relativePath: string): Promise<{ [digest: string]: string }> {
	const content = await readResourceFile(relativePath)
	return Object.fromEntries(content.trim().split('\n').map(line => line.split('  ')))
}
async function parsePathToDigestMap(relativePath: string): Promise<{ [path: string]: string }> {
	const content = await readResourceFile(relativePath)
	return Object.fromEntries(content.trim().split('\n').map(line => line.split('  ').reverse()))
}
async function readFile(branch: BranchName, fileName: string): Promise<string> {
	// return fs.readFile(`${branch}/${fileName}`, 'utf8')
	const tree = await trees[branch]
	const blob = await tree.entryByName(fileName).getBlob()
	return blob.toString()
}
function parseFile<T>(branch: BranchName, fileName: string, constructor?: new (data: any) => T): PLazy<T> {
	return PLazy.from(async () => {
		// console.log(`[${now()}] Starting inner parseFile("${branch}", "${fileName}", ...)`)
		// try {
			const content = await readFile(branch, fileName)
			const parsed = JSON.parse(content)
			return constructor ? new constructor(parsed) : parsed
		// } finally {
		// 	console.log(`[${now()}] Ending inner parseFile("${branch}", "${fileName}", ...)`)
		// }
	})
}

export interface AwaitedMasters {
	appConstant: master.AppConstantMaster
	careInfluence: master.CareInfluenceMaster
	childhoodEvolve: master.ChildhoodEvolveMaster
	defaultTamerName: master.DefaultTamerNameMaster
	digimon: master.DigimonMaster
	digimonBook: master.DigimonBookMaster
	digimonDecreaseMotivation: master.DigimonDecreaseMotivationMaster
	digimonFriendshipLevel: master.DigimonFriendshipLevelMaster
	digimonLevel: master.DigimonLevelMaster
	digimonParameter: master.DigimonParameterMaster
	digimonSell: master.DigimonSellMaster
	digimonSkill: master.DigimonSkillMaster
	evolve: master.EvolveMaster
	evolveUseItem: master.EvolveUseItemMaster
	item: master.ItemMaster
	limitbreak: master.LimitbreakMaster
	limitbreakGroup: master.LimitbreakGroupMaster
	motivationThreshold: master.MotivationThresholdMaster
	personalityType: master.PersonalityTypeMaster
	pluginEvolve: master.PluginEvolveMaster
	pluginParameter: master.PluginParameterMaster
	pluginWearing: master.PluginWearingMaster
	quest: master.QuestMaster
	scrounge: master.ScroungeMaster
	skill: master.SkillMaster
	skillDetail: master.SkillDetailMaster
	skillLevelupItem: master.SkillLevelupItemMaster
	slbParameter: master.SlbParameterMaster
	slbParameterPattern: master.SlbParameterPatternMaster
	tamerLevel: master.TamerLevelMaster
	text: master.TextMaster
	training: master.TrainingMaster
	trainingItem: master.TrainingItemMaster
	trainingItemMaterial: master.TrainingItemMaterialMaster
	trainingUseItem: master.TrainingUseItemMaster
	weeklyLimit: master.WeeklyLimitMaster
	weeklyLimitCount: master.WeeklyLimitCountMaster
	weeklyLimitOpen: master.WeeklyLimitOpenMaster
	weeklyQuest: master.WeeklyQuestMaster
	version: string
	cacheDate: Date
	assetCanonicalization: { [assetPath: string]: string }
}
export type Masters = {
	[K in keyof AwaitedMasters]: Promise<AwaitedMasters[K]>
}

export interface Server<ConstrainedLanguageCodeType extends LanguageCodeType> {
	loginResetJstHour: number
	apiUrlBase: string
	unityVersion: string
	appVersion: string
	masterVersion: string
	resourceVersion: string
	androidPackageId: string
	masters: { [LCT in ConstrainedLanguageCodeType]: Masters }
}
function masters(branch: BranchName, resourceLanguage: 'ja' | 'en' | 'ko' | 'zh'): Masters {
	return {
		appConstant: parseFile(branch, 'mst_app_constant.json', master.AppConstantMaster),
		careInfluence: parseFile(branch, 'mst_care_influence.json', master.CareInfluenceMaster),
		childhoodEvolve: parseFile(branch, 'mst_childhood_evolve.json', master.ChildhoodEvolveMaster),
		defaultTamerName: parseFile(branch, 'mst_default_tamer_name.json', master.DefaultTamerNameMaster),
		digimon: parseFile(branch, 'mst_digimon.json', master.DigimonMaster),
		digimonBook: parseFile(branch, 'mst_digimon_book.json', master.DigimonBookMaster),
		digimonDecreaseMotivation: parseFile(branch, 'mst_digimon_decrease_motivation.json', master.DigimonDecreaseMotivationMaster),
		digimonFriendshipLevel: parseFile(branch, 'mst_digimon_friendship_level.json', master.DigimonFriendshipLevelMaster),
		digimonLevel: parseFile(branch, 'mst_digimon_level.json', master.DigimonLevelMaster),
		digimonParameter: parseFile(branch, 'mst_digimon_parameter.json', master.DigimonParameterMaster),
		digimonSell: parseFile(branch, 'mst_digimon_sell.json', master.DigimonSellMaster),
		digimonSkill: parseFile(branch, 'mst_digimon_skill.json', master.DigimonSkillMaster),
		evolve: parseFile(branch, 'mst_evolve.json', master.EvolveMaster),
		evolveUseItem: parseFile(branch, 'mst_evolve_use_item.json', master.EvolveUseItemMaster),
		item: parseFile(branch, 'mst_item.json', master.ItemMaster),
		limitbreak: parseFile(branch, 'mst_limitbreak.json', master.LimitbreakMaster),
		limitbreakGroup: parseFile(branch, 'mst_limitbreak_group.json', master.LimitbreakGroupMaster),
		motivationThreshold: parseFile(branch, 'mst_motivation_threshold.json', master.MotivationThresholdMaster),
		personalityType: parseFile(branch, 'mst_personality_type.json', master.PersonalityTypeMaster),
		pluginEvolve: parseFile(branch, 'mst_plugin_evolve.json', master.PluginEvolveMaster),
		pluginParameter: parseFile(branch, 'mst_plugin_parameter.json', master.PluginParameterMaster),
		pluginWearing: parseFile(branch, 'mst_plugin_wearing.json', master.PluginWearingMaster),
		quest: parseFile(branch, 'mst_quest.json', master.QuestMaster),
		scrounge: parseFile(branch, 'mst_scrounge.json', master.ScroungeMaster),
		skill: parseFile(branch, 'mst_skill.json', master.SkillMaster),
		skillDetail: parseFile(branch, 'mst_skill_detail.json', master.SkillDetailMaster),
		skillLevelupItem: parseFile(branch, 'mst_skill_levelup_item.json', master.SkillLevelupItemMaster),
		slbParameter: parseFile(branch, 'mst_slb_parameter.json', master.SlbParameterMaster),
		slbParameterPattern: parseFile(branch, 'mst_slb_parameter_pattern.json', master.SlbParameterPatternMaster),
		tamerLevel: parseFile(branch, 'mst_tamer_level.json', master.TamerLevelMaster),
		text: parseFile(branch, 'mst_text.json', master.TextMaster),
		training: parseFile(branch, 'mst_training.json', master.TrainingMaster),
		trainingItem: parseFile(branch, 'mst_training_item.json', master.TrainingItemMaster),
		trainingItemMaterial: parseFile(branch, 'mst_training_item_material.json', master.TrainingItemMaterialMaster),
		trainingUseItem: parseFile(branch, 'mst_training_use_item.json', master.TrainingUseItemMaster),
		weeklyLimit: parseFile(branch, 'mst_weekly_limit.json', master.WeeklyLimitMaster),
		weeklyLimitCount: parseFile(branch, 'mst_weekly_limit_count.json', master.WeeklyLimitCountMaster),
		weeklyLimitOpen: parseFile(branch, 'mst_weekly_limit_open.json', master.WeeklyLimitOpenMaster),
		weeklyQuest: parseFile(branch, 'mst_weekly_quest.json', master.WeeklyQuestMaster),
		version: PLazy.from(() => parseFile<master.MasterManifest>(branch, 'master_manifest.json').then(m => m.version)),
		cacheDate: PLazy.from(() => commits[branch].then(c => c.date())),
		assetCanonicalization: PLazy.from(async () => {
			const digests = await parsePathToDigestMap(`${resourceLanguage}/decoded.blake2b`)
			// Read sequentially to ensure that this definitely contains all digests
			const canonicalPaths = await parseDigestToPathMap('canonical.blake2b')
			return Object.fromEntries(Object.entries(digests).map(([path, digest]) => [
				path.replace(/^assets\/application\/editor\/resources\/assetbundles\/|\.png$/g, ''),
				canonicalPaths[digest]!.replace(/^a\/|\.png$/g, ''),
			]))
		}),
	}
}
export type ServerName = 'jp' | 'ww'
export const servers: {jp: Server<LanguageCodeType.Ja>, ww: Server<LanguageCodeType.En | LanguageCodeType.Ko | LanguageCodeType.Zh>} = {
	jp: {
		loginResetJstHour: 4,
		apiUrlBase: 'https://api.digi-rise.com/api/',
		unityVersion: '2018.4.11f1',
		appVersion: '99.9.0',
		masterVersion: '2022-02-18 10:44:27',
		resourceVersion: '2022-02-10 17:00:34',
		// appVersion: '',
		// masterVersion: '',
		// resourceVersion: '',
		androidPackageId: 'com.bandainamcoent.digimon_rearise',
		masters: {
			[LanguageCodeType.Ja]: masters('master', 'ja'),
		},
	},
	ww: {
		loginResetJstHour: 0,
		apiUrlBase: 'https://digirige-os-api.channel.or.jp/api/',
		unityVersion: '2018.4.11f1',
		appVersion: '99.9.0',
		// masterVersion: '2020-04-10 13:35:19',
		// resourceVersion: '2020-03-31 03:01:53',
		// appVersion: '',
		masterVersion: '',
		resourceVersion: '',
		androidPackageId: 'com.bandainamcoent.digimon_rearise_ww',
		masters: {
			[LanguageCodeType.En]: masters('en', 'en'),
			[LanguageCodeType.Ko]: masters('ko', 'ko'),
			[LanguageCodeType.Zh]: masters('zh', 'zh'),
		},
	},
}
