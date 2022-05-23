import { Request, ResponseToolkit } from '@hapi/hapi'
import * as api from '../../digimon-rearise-bots/apitypes'
import { getValidCommonRequest } from "../common/digi_utils";

export async function GetVortexBattlesHandler (request: Request, responseHelper: ResponseToolkit): Promise<api.WeeklyTop.Response> {
    const commonRequest = await getValidCommonRequest(request)
    return {
        weeklyProgressInfoList: [],
    }
}

export async function GetWeeklyTimetableHandler (request: Request, responseHelper: ResponseToolkit): Promise<api.WeeklyTimesInfo.Response> {
    const commonRequest = await getValidCommonRequest(request)
    return {
        weeklyQuestTimesInfoList: [],
    }
}