import { Request, ResponseToolkit } from '@hapi/hapi'
import * as api from '../../digimon-rearise-bots/apitypes'
import { getValidCommonRequest } from "../common/digi_utils";

export async function GetVortexBattlesHandler (req: Request, res: ResponseToolkit): Promise<api.WeeklyTop.Response> {
    const commonRequest = await getValidCommonRequest(req)
    return {
        weeklyProgressInfoList: [],
    }
}

export async function GetWeeklyTimetableHandler (req: Request, res: ResponseToolkit): Promise<api.WeeklyTimesInfo.Response> {
    const commonRequest = await getValidCommonRequest(req)
    return {
        weeklyQuestTimesInfoList: [],
    }
}