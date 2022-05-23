import { Request, ResponseToolkit } from '@hapi/hapi'
import * as api from '../../digimon-rearise-bots/apitypes'
import { getValidCommonRequest } from "../common/digi_utils";

export async function GetShopHandler (request: Request, responseHelper: ResponseToolkit): Promise<api.ShopTop.Response> {
    const commonRequest = await getValidCommonRequest(request)
    return {
        shopList: [],
        reloadPrizeList: [],
        limitedTimeEventList: [],
        isMaintenanceApi: true,
        maintenanceText: '奉仕作動しません / Shop Not Implemented Yet...',
    }
}

export async function GetPurchaseHistoryHandler (request: Request, responseHelper: ResponseToolkit): Promise<api.DpointGetPurchaseHistory.Response> {
    const commonRequest = await getValidCommonRequest(request)
    return {
        freeDigiruby: 0,
        purchaseDigiruby: 0,
        purchaseHistoryList: [],
    }
}