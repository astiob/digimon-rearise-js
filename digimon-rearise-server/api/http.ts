import { Request, ResponseToolkit } from '@hapi/hapi'
import * as path from "path";
import * as fs from "fs";

// todo: Fix Error 200s when file is not found.
const error404Response = { "statusCode": 200, "error": "Not Found", "message": "Uh, don't you think something weird is up?" }

function getExt(str: string) {
    const basename = path.basename(str);
    const firstDot = basename.indexOf('.');
    const lastDot = basename.lastIndexOf('.');
    const extname = path.extname(basename).replace(/(\.[a-z0-9]+).*/i, '$1');

    if (firstDot === lastDot) {
        return extname;
    }

    return basename.slice(firstDot, lastDot) + extname;
}

export async function PublicPageServerHandler (request: Request, responseHelper: ResponseToolkit) {
    let resolvedPath = path.resolve(path.join("./public/", request.path))
    if (fs.existsSync(resolvedPath)) {
        if (fs.lstatSync(resolvedPath).isDirectory())
            resolvedPath = path.join(resolvedPath, "index.html")
        if (!fs.existsSync(resolvedPath))
            return error404Response
        return responseHelper.file(resolvedPath)
    }
    return error404Response;
}