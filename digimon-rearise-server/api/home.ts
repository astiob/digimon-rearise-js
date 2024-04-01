import { Request, ResponseToolkit } from '@hapi/hapi'
import * as api from '../../digimon-rearise-bots/apitypes'
import { getValidCommonRequest } from "../common/digi_utils";
import { formatDate } from "../common/utils";
import {pool} from "../index";
import {servers} from "../../digimon-rearise-bots/server";
import mysql from "mysql2/promise";

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

export async function GetHomeStatusHandler (request: Request, responseHelper: ResponseToolkit): Promise<api.HomeStatusEvery.Response> {
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

const homeStatusIntervals = {
    "socialTopInfo": {
        "highPriorityBoardContentInfo": {
            "count": 0,
            "isNew": false,
            "updatedAt": "2000-01-01T00:00:00+09:00"
        },
        "lowPriorityBoardContentInfo": {
            "count": 0,
            "isNew": false,
            "updatedAt": "2000-01-01T00:00:00+09:00"
        },
        "friendLogInfo": {
            "count": 0,
            "isNew": false,
            "updatedAt": "2000-01-01T00:00:00+09:00"
        },
        "clanLogInfo": {
            "count": 0,
            "isNew": false,
            "updatedAt": "2000-01-01T00:00:00+09:00"
        }
    },
    "bannerIds": [],
    "visitorList": [],
    "reloadPrizeList": [],
    "isDigirubySaleAvailable": false,
    "gashaInfo": {
        "gashaIds": [],
        "isHighlight": false
    },
    "homeCircleAssetName": "home/circle_menu/home_circle_asset001"
}

export async function GetHomeTimersHandler (request: Request, responseHelper: ResponseToolkit): Promise<api.HomeStatusIntervals.Response> {
    const commonRequest = await getValidCommonRequest(request)
    return {
        ...homeStatusIntervals,
        visitorList: [{
            userId: 0,
            tamerName: {
                [api.LanguageCodeType.Ja]: "エイプリルフール",
                [api.LanguageCodeType.En]: "April Fools",
                [api.LanguageCodeType.Ko]: "만우절",
                [api.LanguageCodeType.Zh]: "愚人節",
            }[commonRequest.languageCodeType ?? api.LanguageCodeType.Ja],
            tamerLevel: 1,
            relationshipType: api.FriendState.Guest,
            isClanMember: false,
            visitorDigimon: {
                baseInfo: {
                    userDigimonId: 0,
                    digimonId: 1998105,
                    level: 99,
                    maxLevel: 99,
                    friendshipLevel: 99,
                    maxFriendshipLevel: 99,
                    moodValue: 0,
                    skillLevel: 1,
                    executionLimitbreakId: 0,
                    completeTrainingIds: [],
                    lastBrokenSlbNecessaryLevel: 0,
                    wearingPluginList: [],
                    lastCareTime: "2000-01-01T00:00:00+09:00",
                    awakingLevel: 0,
                },
                friendshipPoint: 0,
            },
            isTalked: false,
        }],
    }
}

export async function ClaimDailyLoginBonusRequestHandler (request: Request, responseHelper: ResponseToolkit): Promise<api.HomeLogin.Response> {
    const commonRequest = await getValidCommonRequest(request)
    return {
        receivedLoginBonusList: []
    }
}

export async function GetActivityBoardDataHandler (request: Request, responseHelper: ResponseToolkit): Promise<api.HomeBoard.Response> {
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

export async function SetHomeTrainingDigimonHandler (request: Request, responseHelper: ResponseToolkit): Promise<api.HomeDigimonEdit.Response> {
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