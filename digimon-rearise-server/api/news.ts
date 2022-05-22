import { Request, ResponseToolkit } from '@hapi/hapi'
import * as api from '../../digimon-rearise-bots/apitypes'
import {getValidCommonRequest} from "../common/digi_utils";

export async function GetSideMenuEventListHandler (req: Request, res: ResponseToolkit): Promise<api.SideMenuGetEvent.Response> {
    const commonRequest = await getValidCommonRequest(req)
    return {
        raidEventInSessionList: [],
        scenarioEventInSessionList: [],
        bceInSessionList: [],
        mprInSessionList: [],
    }
}