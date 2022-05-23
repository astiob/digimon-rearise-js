import { Request, ResponseToolkit } from '@hapi/hapi'
import * as api from '../../digimon-rearise-bots/apitypes'
import {getValidCommonRequest} from "../common/digi_utils";

export async function GetPresentsDataHandler (request: Request, responseHelper: ResponseToolkit): Promise<api.PresentTop.Response> {
    const commonRequest = await getValidCommonRequest(request)
    return {
        presentList: [],
        socialPresentList: [],
        isPresentOver: false,
        isSocialOver: false,
    }
}