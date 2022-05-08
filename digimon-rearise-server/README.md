# digimon-rearise-server

A Digimon ReArise Private Server written in Typescript with the Hapi framework. This is the main server code.  
It uses a bunch of auxillery support code from the bot, which you may know as "Mon" on the Discord.

## Getting Started

Before you begin, you should go through the *Getting Started* checklist in the global *README.md* file, found one folder up in the root
directory of the project.

1. Create a `config.json` from the `config-template.json` file. (See Note 1)
2. Setup a MySQL Database, somewhere.
3. Enter your MySQL Database Credentials into the `db` object in `config.json`.
4. // mitm?
5. // Run?

## Troubleshooting

...

## Common Operations

### Changing Database Schema

...

### Changing Game Data Schema

...

## Notes

1. `encryptionKey` and `sessionIdKey` are only required for proxying to the real ReArise server.