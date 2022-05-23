import { Request, ResponseToolkit } from '@hapi/hapi'
import * as api from '../../digimon-rearise-bots/apitypes'
import { now } from "../../digimon-rearise-bots/util";
import { getValidCommonRequest } from "../common/digi_utils";

export async function GetCurrentMissionsHandler (request: Request, responseHelper: ResponseToolkit): Promise<api.MissionTop.Response> {
    const commonRequest = await getValidCommonRequest(request)
    return {
        missionProgressInfoList: [],
        notReceiveMissionIdList: [],
        // playingSpecialMissionId: 0,
    }
}

export async function GetCompletedMissionsHandler (request: Request, responseHelper: ResponseToolkit): Promise<api.MissionComplete.Response> {
    const commonRequest = await getValidCommonRequest(request)
    if (![19, 21, 28].includes((request.payload as any).condition))
        console.log(`[${now()}]`, request.auth.credentials.user!.userId, request.path, request.payload)
    return {
        result: false
    }
}