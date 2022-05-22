import { Request, ResponseToolkit } from '@hapi/hapi'
import * as api from '../../digimon-rearise-bots/apitypes'
import { getValidCommonRequest } from "../common/digi_utils";

export async function GetCurrentRaidsHandler (req: Request, res: ResponseToolkit): Promise<api.XlbGetTop.Response> {
    const commonRequest = await getValidCommonRequest(req)
    return {
        sectionList: [],
    }
}