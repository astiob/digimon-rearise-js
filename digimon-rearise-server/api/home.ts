import { Request, ResponseToolkit } from '@hapi/hapi'
import * as api from '../../digimon-rearise-bots/apitypes'
import { getValidCommonRequest } from "../common/digi_utils";
import { formatDate } from "../common/utils";
import {pool} from "../index";

export async function ClaimDailyLoginBonusRequestHandler (req: Request, res: ResponseToolkit): Promise<api.HomeLogin.Response> {
    const commonRequest = await getValidCommonRequest(req)
    return {
        receivedLoginBonusList: []
    }
}

export async function GetActivityBoardDataHandler (req: Request, res: ResponseToolkit): Promise<api.HomeBoard.Response> {
    const commonRequest = await getValidCommonRequest(req)
    const zeroLogObject = {
        count: 0,
        isNew: false,
        updatedAt: formatDate(),
    }
    return {
        logList: [],
        reliefRequest: zeroLogObject,
        friend: zeroLogObject,
        clan: zeroLogObject,
        clanCareRequest: zeroLogObject,
        helper: zeroLogObject,
    }
}

export async function SetHomeTrainingDigimonHandler (req: Request, res: ResponseToolkit): Promise<api.HomeDigimonEdit.Response> {
    const commonRequest = await getValidCommonRequest(req)

    const payload = req.payload as api.HomeDigimonEdit.Request
    if (typeof payload.homeDigimonList !== 'object' || !(payload.homeDigimonList instanceof Array))
        throw new Error('invalid `homeDigimonList`')
    if (payload.homeDigimonList.length !== 7 || !payload.homeDigimonList.every(x => typeof x === 'number' && (x | 0) === x))
        throw new Error('invalid `homeDigimonList`')

    const userId = req.auth.credentials.user!.userId
    await pool.execute(
        'update `user` set `home_digimon_0` = ?, `home_digimon_1` = ?, `home_digimon_2` = ?, `home_digimon_3` = ?, `home_digimon_4` = ?, `home_digimon_5` = ?, `home_digimon_6` = ? where `user_id` = ?',
        [
            ...payload.homeDigimonList,
            userId,
        ]
    )
    return {
        result: true,
    }
}