import {Request} from "@hapi/hapi";
import * as api from "../../digimon-rearise-bots/apitypes";
import Boom from "@hapi/boom";
import {appVersion} from "./config";
import {masterVersion, resourceVersion} from "../api/assets";

export function digiriseError(errorNumber: api.ErrorNumber) {
    const boom = new Boom.Boom()
    boom.output.payload = {errorNumber} as unknown as Boom.Payload
    return boom
}

export async function getValidCommonRequest(request: Request, verifyAllVersions: boolean = true): Promise<api.CommonRequest> {
    const payload: any = request.payload
    if (typeof payload !== 'object')
        throw new Error

    if (!('commonRequest' in payload))
        throw new Error
    const commonRequest = payload.commonRequest
    if (typeof commonRequest !== 'object')
        throw new Error

    if (!('osType' in commonRequest))
        throw new Error
    if (commonRequest.osType !== api.OsType.iOS && commonRequest.osType !== api.OsType.Android)
        throw new Error

    if (!('version' in commonRequest))
        throw new Error
    const {version} = commonRequest
    if (typeof version !== 'object')
        throw new Error

    if (!('appVersion' in version) || typeof version.appVersion !== 'string' ||
        !('masterVersion' in version) || typeof version.masterVersion !== 'string' ||
        !('resourceVersion' in version) || typeof version.resourceVersion !== 'string')
        throw new Error

    let languageCodeType: api.LanguageCodeType
    if ('languageCodeType' in commonRequest) {
        const {languageCodeType: lct} = commonRequest
        if (lct !== api.LanguageCodeType.En &&
            lct !== api.LanguageCodeType.Ko &&
            lct !== api.LanguageCodeType.Zh)
            throw new Error
        languageCodeType = lct
    } else {
        languageCodeType = api.LanguageCodeType.Ja
    }

    if (version.appVersion !== appVersion)
        throw digiriseError(api.ErrorNumber.ApplicationUpdate)
    if (verifyAllVersions) {
        if (version.masterVersion !== '' && version.masterVersion !== await masterVersion(languageCodeType) ||
            version.resourceVersion !== '' && version.resourceVersion !== await resourceVersion(languageCodeType)) {
            // console.warn({
            // 	expected: {
            // 		masterVersion: await masterVersion(languageCodeType),
            // 		resourceVersion: await resourceVersion(languageCodeType),
            // 	}
            // })
            throw digiriseError(api.ErrorNumber.MasterOrResourceUpdate)
        }
    }

    return commonRequest
}