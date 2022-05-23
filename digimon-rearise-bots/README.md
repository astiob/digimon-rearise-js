# digimon-rearise-bots

A series of scripts that dumps information from ReArise into Discord.

It has two functions:

* Dumping new data into Discord
* Listening to commands and replying lookup information

## Getting Started

Before you begin, you should go through the *Getting Started* checklist in the global *README.md* file, found one folder up in the root
directory of the project.

1. Create a `config.json` from the `config-template.json` file. (See Note 1)
2. Set up a MySQL Database, somewhere.
3. Enter your MySQL Database Credentials into the `db` object in `config.json`.
4. [Create a Discord bot token](https://www.writebots.com/discord-bot-token/) and enter it into `clientId` and `token` in `config.json`.
5. Follow `mitm` (or whichever Proxy you use) instructions below
6. Build the module with `npm run tsc`.
7. Run the module with `node .`, `node index.js` or `npx index.js`.

### mitm Proxy