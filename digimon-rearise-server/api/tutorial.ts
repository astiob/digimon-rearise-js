import { Request, ResponseToolkit } from '@hapi/hapi'
import * as api from '../../digimon-rearise-bots/apitypes'
import mysql from "mysql2/promise";
import {getValidCommonRequest} from "../common/digi_utils";
import {pool} from "../index";

export async function UpdateTutorialProgressHandler (request: Request, responseHelper: ResponseToolkit): Promise<api.WithCommonResponse<object>> {
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