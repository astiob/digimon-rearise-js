import { Request, ResponseToolkit } from '@hapi/hapi'
import * as api from '../../digimon-rearise-bots/apitypes'
import { now } from "../../digimon-rearise-bots/util";
import { getValidCommonRequest } from "../common/digi_utils";

export async function GetCurrentMissionsHandler (req: Request, res: ResponseToolkit): Promise<api.MissionTop.Response> {
    const commonRequest = await getValidCommonRequest(req)
    return {
        missionProgressInfoList: [],
        notReceiveMissionIdList: [],
        // playingSpecialMissionId: 0,
    }
}

export async function GetCompletedMissionsHandler (req: Request, res: ResponseToolkit): Promise<api.MissionComplete.Response> {
    const commonRequest = await getValidCommonRequest(req)
    if (![19, 21, 28].includes((req.payload as any).condition))
        console.log(`[${now()}]`, req.auth.credentials.user!.userId, req.path, req.payload)
    return {
        result: false
    }
}