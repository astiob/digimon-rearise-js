import { Request, ResponseToolkit } from '@hapi/hapi'
import * as api from '../../digimon-rearise-bots/apitypes'
import {getValidCommonRequest} from "../common/digi_utils";

export async function GetChallengeStatusHandler (req: Request, res: ResponseToolkit): Promise<api.ChallengeTop.Response> {
    const commonRequest = await getValidCommonRequest(req)
    return {
        challengeGroupList: [],
        endChallengeGroupIdList: [],
    }
}