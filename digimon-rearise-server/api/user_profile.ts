import { Request, ResponseToolkit } from '@hapi/hapi'
import * as api from '../../digimon-rearise-bots/apitypes'
import {digiriseError, getValidCommonRequest} from "../common/digi_utils";
import mysql from "mysql2/promise";
import {servers} from "../../digimon-rearise-bots/server";
import {pool} from "../index";

export async function GetUserProfileTopHandler (request: Request, responseHelper: ResponseToolkit): Promise<api.ProfileTop.Response> {
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

export async function EditUserProfileHandler (request: Request, responseHelper: ResponseToolkit): Promise<api.ProfileEdit.Response> {
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