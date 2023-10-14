# digimon-rearise-js

This is a collection of programs that we use to run Digimon-ReArise related programs. It is comprised of two main projects:

  * `digimon-rearise-bots` contains an API-level client bot that was used to automate monotonous tasks in the game and powered the [real-time graph](https://chortos.selfip.net/digimonrearise/mpr/1120) and “Huckmon” Discord bot during Japan’s vs. Guardians event and, later, account transfer from the official servers, as well as some utilities originally meant for an automated website about the game.

  * `digimon-rearise-server` is a reverse-engineered server that runs the game's code.
  
Currently tested on: Node.js 16.14 (LTS ‘Gallium’)

Node.js 16.6+ is definitely required for the Discord bot.

  
## Getting Started

This repository has been configured to run with both VSCode and JetBrains WebStorm. Be sure to also read the *README.md*(s) in each project's respective folder.

1. Install node modules (`npm i`) in both the bot and the server (if you're working on it).
2. Follow each project's *Getting Started* in their respective *README.md* file.