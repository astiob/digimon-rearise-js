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

export async function GetAllNewsHandler (req: Request, res: ResponseToolkit): Promise<api.InformationGetList.Response> {
    const commonRequest = await getValidCommonRequest(req)
    return {
        informationList: [],
        bannerIdList: [],
    }
}

export async function GetNewsDetailHandler (req: Request, res: ResponseToolkit): Promise<api.InformationGetDetail.Response> {
    const commonRequest = await getValidCommonRequest(req)
    return {description: ''}
}