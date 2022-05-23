import { Request, ResponseToolkit } from '@hapi/hapi'
import * as api from '../../digimon-rearise-bots/apitypes'
import {getValidCommonRequest} from "../common/digi_utils";

export async function GetSideMenuEventListHandler (request: Request, responseHelper: ResponseToolkit): Promise<api.SideMenuGetEvent.Response> {
    const commonRequest = await getValidCommonRequest(request)
    return {
        raidEventInSessionList: [],
        scenarioEventInSessionList: [],
        bceInSessionList: [],
        mprInSessionList: [],
    }
}

export async function GetAllNewsHandler (request: Request, responseHelper: ResponseToolkit): Promise<api.InformationGetList.Response> {
    const commonRequest = await getValidCommonRequest(request)
    return {
        informationList: [],
        bannerIdList: [],
    }
}

export async function GetNewsDetailHandler (request: Request, responseHelper: ResponseToolkit): Promise<api.InformationGetDetail.Response> {
    const commonRequest = await getValidCommonRequest(request)
    return {description: ''}
}