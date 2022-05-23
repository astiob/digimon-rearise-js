import { Request, ResponseToolkit } from '@hapi/hapi'
import * as api from '../../digimon-rearise-bots/apitypes'
import {getValidCommonRequest} from "../common/digi_utils";

export async function GetAvailableClashBattlesHandler (request: Request, responseHelper: ResponseToolkit): Promise<api.RaidTop.Response> {
    const commonRequest = await getValidCommonRequest(request)
    return {
        notJoinList: [],
        joinList: [],
        endList: [],
        userRaidCatalogList: [],
        latestRaidCatalogDate: '2022-02-14T15:00:00+09:00',
    }
}

export async function GetAvailableSpawnableClashBattlesHandler (request: Request, responseHelper: ResponseToolkit): Promise<api.RaidCatalogTop.Response> {
    const commonRequest = await getValidCommonRequest(request)
    return {
        raidCatalogList: [],
    }
}