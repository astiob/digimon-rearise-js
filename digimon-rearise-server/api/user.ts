import {Request, ResponseToolkit} from '@hapi/hapi'
import * as api from '../../digimon-rearise-bots/apitypes'
import {digiriseError, getValidCommonRequest} from "../common/digi_utils";
import mysql from "mysql2/promise";
import crypto from "crypto";
import {sessionIdKey} from "../config.json";
import {servers} from "../../digimon-rearise-bots/server";
import {DefaultTamerNameMaster} from "../../digimon-rearise-bots/master";
import {allDigimonCodes, getMasters} from "./assets";
import {appVersion} from "../common/config";
import {pool} from "../index";

function isUserCreateSession(sessionId: string) {
    const decipher = crypto.createDecipheriv('aes-128-ecb', Buffer.from(sessionIdKey, 'hex'), null).setAutoPadding(false)
    const decrypted = Buffer.concat([decipher.update(sessionId, 'hex'), decipher.final()])
    return !!(decrypted.readUInt8(4) & 0x80)
}

async function getUserData(pool: mysql.Pool, userId: number, language: api.LanguageCodeType, triggerPrettyDownload: boolean, tamerName?: string): Promise<api.UserData> {
    let userReadScenarioIdList = [
        10001,
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
        for (const userDigimon of savedUserData.userDigimonList)
            userDigimon.isEcLocked = false
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

export async function GetFullSaveDataHandler(req: Request, res: ResponseToolkit): Promise<api.WithCommonResponse<api.UserGetAll.Response> | api.UserGetAll.Response> {
    const commonRequest = await getValidCommonRequest(req, false)
    const userId = req.auth.credentials.user!.userId
    let tamerName
    let firstTutorialState = isUserCreateSession(req.auth.artifacts.sessionId!) ? api.FirstTutorialState.Download : api.FirstTutorialState.End
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
        homeDigimonList = [0, 1, 2, 3, 4, 5, 6].map(i => row[`home_digimon_${i}`])
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

export async function UpdateUserLanguageHandler(req: Request, res: ResponseToolkit): Promise<api.ChangeLanguage.Response> {
    const commonRequest = await getValidCommonRequest(req, false)
    return {
        result: true,
    }
}

export async function UpdateUserVoiceLanguageHandler(req: Request, res: ResponseToolkit): Promise<api.ChangeVoice.Response> {
    const commonRequest = await getValidCommonRequest(req, false)
    return {
        result: true,
    }
}

export async function SetPartnerDigimonHandler(req: Request, res: ResponseToolkit): Promise<api.DigimonSetPartner.Response> {
    const commonRequest = await getValidCommonRequest(req)

    const payload = req.payload as api.DigimonSetPartner.Request
    if (typeof payload.userDigimonId !== 'number' || (payload.userDigimonId | 0) !== payload.userDigimonId)
        throw new Error('invalid `userDigimonId`')

    const userId = req.auth.credentials.user!.userId
    if (userId >= 0x02_00_00_00)
        return {result: false}
    else {
        await pool.execute(
            `
                update \`user\`
                set \`partner_digimon_id\` = ?,
                    \`home_digimon_0\`     = case \`home_digimon_0\` when ? then ${api.UserData.EmptyUserDigimonId} else \`home_digimon_0\` end,
                    \`home_digimon_1\`     = case \`home_digimon_1\` when ? then ${api.UserData.EmptyUserDigimonId} else \`home_digimon_1\` end,
                    \`home_digimon_2\`     = case \`home_digimon_2\` when ? then ${api.UserData.EmptyUserDigimonId} else \`home_digimon_2\` end,
                    \`home_digimon_3\`     = case \`home_digimon_3\` when ? then ${api.UserData.EmptyUserDigimonId} else \`home_digimon_3\` end,
                    \`home_digimon_4\`     = case \`home_digimon_4\` when ? then ${api.UserData.EmptyUserDigimonId} else \`home_digimon_4\` end,
                    \`home_digimon_5\`     = case \`home_digimon_5\` when ? then ${api.UserData.EmptyUserDigimonId} else \`home_digimon_5\` end,
                    \`home_digimon_6\`     = case \`home_digimon_6\` when ? then ${api.UserData.EmptyUserDigimonId} else \`home_digimon_6\` end
                where \`user_id\` = ?
            `,
            [
                payload.userDigimonId,
                payload.userDigimonId,
                payload.userDigimonId,
                payload.userDigimonId,
                payload.userDigimonId,
                payload.userDigimonId,
                payload.userDigimonId,
                payload.userDigimonId,
                userId,
            ]
        )
        return {
            result: true,
        }
    }
}

export async function GetAllFriendsHandler(req: Request, res: ResponseToolkit): Promise<api.FriendTop.Response> {
    const commonRequest = await getValidCommonRequest(req)
    return {
        friendList: [],
        approvalWaitingList: [],
        applyingList: [],
        approvalWaitingLimit: 30,
        applyingLimit: 30,
        // addCommuPoint: 0,
    }
}

export async function UpdateGDPRFlagHandler(req: Request, res: ResponseToolkit): Promise<api.UserGdpr.Response> {
    const commonRequest = await getValidCommonRequest(req, false)
    const payload = req.payload as api.WithCommonRequest<api.UserGdpr.Request>

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

    const userId = req.auth.credentials.user!.userId
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