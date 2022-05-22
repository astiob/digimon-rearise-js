import { Request, ResponseToolkit } from '@hapi/hapi'
import * as api from '../../digimon-rearise-bots/apitypes'
import { getValidCommonRequest } from "../common/digi_utils";

export async function GetGachaTopHandler (req: Request, res: ResponseToolkit): Promise<api.GashaTop.Response> {
    const commonRequest = await getValidCommonRequest(req)
    return {
        gashaGroupList: [],
        userDigiruby: {
            paidDigiruby: 0,
            freeDigiruby: 0,
        },
        stepupGashaGroupList: [],
    }
}

export async function GetGachaRateDetailHandler (req: Request, res: ResponseToolkit): Promise<api.GashaGetRate.Response> {
    const commonRequest = await getValidCommonRequest(req)
    const payload = req.payload as api.GashaGetRate.Request
    if (payload.gashaGroupId) {
        // use it
    } else if (payload.gashaIdList) {
        // use it
        // if at least one does not exist: ServerError
        // if at least one is not currently active: ExecuteOutOfPeriod
    } else {
        throw new Error
    }
    throw new Error
}