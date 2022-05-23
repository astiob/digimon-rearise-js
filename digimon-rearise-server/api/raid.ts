import { Request, ResponseToolkit } from '@hapi/hapi'
import * as api from '../../digimon-rearise-bots/apitypes'
import { getValidCommonRequest } from "../common/digi_utils";

export async function GetCurrentRaidsHandler (request: Request, responseHelper: ResponseToolkit): Promise<api.XlbGetTop.Response> {
    const commonRequest = await getValidCommonRequest(request)
    return {
        sectionList: [],
    }
}