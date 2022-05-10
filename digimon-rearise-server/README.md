# digimon-rearise-server

A Digimon ReArise Private Server written in Typescript with the Hapi framework. This is the main server code.  
It uses a bunch of auxillery support code from the bot, which you may know as "Mon" on the Discord.

## Getting Started

Before you begin, you should go through the *Getting Started* checklist in the global *README.md* file, found one folder up in the root
directory of the project.

1. Create a `config.json` from the `config-template.json` file. (See Note 1)
2. Setup a MySQL Database, somewhere.
3. Enter your MySQL Database Credentials into the `db` object in `config.json`.
4. Setup a HTTP proxy with your reverse proxy of choice. Included below are instructions for `mitm`.
5. Copy the entirety of the [game's resources](https://github.com/astiob/digimon-rearise-resources-raw) into the root folder and set that as the `resourceRepositoryPath` in `config.json`.  
   You may have to download the resources first.
6. Build the `digimon-rearise-bot` repository first (`npm run tsc` in there), if you haven't already.
7. Build the module with `npm run tsc`.
8. Run the module with `node .`, `node index.js` or `npx index.ts`.

### mitm Proxy

...

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

You can find them <we haven't uploaded our changes yet since it's not really centralized or anyhting yet>.

## Common Operations

### Changing Database Schema

...

### Changing Game Data Schema

...

## Notes

1. `encryptionKey` and `sessionIdKey` are only required for proxying to the real ReArise server.