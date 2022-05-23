import { Request, ResponseToolkit } from '@hapi/hapi'
import * as api from '../../digimon-rearise-bots/apitypes'
import {getValidCommonRequest} from "../common/digi_utils";

const globalWidgetInformation = {
    [api.LanguageCodeType.En]: 'Realize your Digimon adventure.\n',
    [api.LanguageCodeType.Ko]: '지금, 당신의 모험이 현실이 된다!\n',
    [api.LanguageCodeType.Zh]: '你的冒險，即將化為現實！\n',
}
export async function WidgetHandler (request: Request, responseHelper: ResponseToolkit) {
    const payload: any = request.payload
    if (!payload)
        return '今、キミの冒険が現実となる！\n'
    const languageCodeType = payload.commonRequest?.languageCodeType
    const info = typeof languageCodeType === 'number' && (globalWidgetInformation as { [lct: number]: string })[languageCodeType]
    return info || globalWidgetInformation[api.LanguageCodeType.En]
}