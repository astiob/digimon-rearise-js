# digimon-rearise-server

A Digimon ReArise Private Server written in Typescript with the Hapi framework. This is the main server code.  
It uses a bunch of auxillery support code from the bot, which you may know as "Mon" on the Discord.

## Getting Started

Before you begin, you should go through the *Getting Started* checklist in the global *README.md* file, found one folder up in the root
directory of the project.

1. Create a `config.json` from the `config-template.json` file. (See Note 1)
2. Setup a MySQL Database, somewhere.
3. Install the schema (`setup/schema.sql`) into the database.
4. Enter your MySQL Database Credentials into the `db` object in `config.json`.
5. Setup a HTTP proxy with your reverse proxy of choice. Included below are instructions for `mitm`.
6. Copy the entirety of the [game's resources](https://github.com/astiob/digimon-rearise-resources-raw) into the root folder and set that as the `resourceRepositoryPath` in `config.json`.  
   You may have to download the resources first.
7. Build the `digimon-rearise-bot` repository first (`npm run tsc` in there), if you haven't already.
8. Build the module with `npm run build`.
9. Run the module with `npm run start`, `node .`, `node index.js` or `npx index.ts`.

### mitm Proxy

1. Install `mitmproxy` from [https://mitmproxy.org/](https://mitmproxy.org/).
2. Run `mitmproxy` for the first time. Close it.
3. Navigate to your user home (`~` on Linux, and `%userprofile%` on Windows) and into the `.mitmproxy` folder.
4. Drag `config.yaml` and `local-redirect.py` into your `.mitm` folder.
5. Follow the Android/iOS Proxy setup instructions as per in the public page (`/public/index.html` or on [the website](https://digi-rearise.is-saved.org)).
6. Follow the certificate instructions on `mitm.it` ([see also](http://wiki.cacert.org/FAQ/ImportRootCert#Android_Phones_.26_Tablets); only works when you're connected to the proxy; do Step 5 first!).

This script may be useful:
```bash
cd .mitmproxy
openssl crl2pkcs7 -nocrl -certfile mitmproxy-ca.pem | openssl pkcs7 -print_certs -out mitmproxy-ca.crt
openssl x509 -inform PEM -subject_hash_old -in mitmproxy-ca.crt | head -1            # This is your cert hash; ie. c8750f0d
cat mitmproxy-ca.crt > <hash>.0                                                      # Your hash goes here; ie. cat mitmproxy-ca.crt > c8750f0d.0
adb push <hash>.0 /system/etc/security/cacerts                                       # Root required; push root certificate to master store.
```

## Troubleshooting

### Dependencies Fail

If you receive an error that looks like:

```
Cannot find Module 'digi-rise/apitypes'
...
code: 'ERR_DLOPEN_FAILED'
```

Ensure you have updated `npm` to the latest version, and are using a version of Node that is 16 or above.

### Missing Files

The frontpage of [https://digi-rearise.is-saved.org/](https://digi-rearise.is-saved.org/) is stored in `/public`.  
We've excluded the APKs because we can't really upload them into GitHub.

You can find them <we haven't uploaded our changes yet since it's not really centralized or anything yet>.

## Code Structure

  * `common` contains utlity/common code.
  * `endpoints` contains the API functionality.
  * `public` is the public files served when you attempt to access the server via HTTP; it contains our public frontpage.
  * `setup` are any relevant information.
  * `docs` contains documentation-related stuff.
  * `index.ts` is the entry point.

## Common Operations

### Changing Database Schema

...

### Changing Game Data Schema

...

### Adding a new Endpoint

1. Create a new entry in `index.ts`
   ```typescript
   import { NewRequestHandler } from "./api/path/to/endpoint";
   
   server.route({
       method: 'POST',
       path: '/path/to/endpoint',
       handler: NewRequestHandler
   })
   ```
2. Design your new endpoint function in `/api`
   ```typescript
   import { Request, ResponseToolkit } from '@hapi/hapi'
   import * as api from '../../digimon-rearise-bots/apitypes'
   
   export async function NewRequestHandler (request: Request, responseHelper: ResponseToolkit): Promise<T> {
       const commonRequest = await getValidCommonRequest(request, false)
       const payload: T = {}; // replace 'T' with the response datatype.
       return payload;
   }
   ```
   Note: `getValidCommonRequest` is part of `common/digi_utils`.

## Notes

1. `encryptionKey` and `sessionIdKey` are only required for proxying to the real ReArise server.