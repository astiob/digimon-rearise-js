import { Request, ResponseToolkit } from '@hapi/hapi'
import * as api from '../../digimon-rearise-bots/apitypes'
import {getValidCommonRequest} from "../common/digi_utils";

export async function GetAllCutsceneListHandler (request: Request, responseHelper: ResponseToolkit): Promise<api.RaidRankingScenarioDictionary.Response> {
    const commonRequest = await getValidCommonRequest(request)
    return {
        dictionaryList: [],
    }
}