import {SlashCommandBuilder} from '@discordjs/builders'
import {REST} from '@discordjs/rest'
import {Routes} from 'discord-api-types/v9'
import {clientId, guildIds, token} from './config.json'

const commands = [
	new SlashCommandBuilder().setName('gsj').setDescription('Shows Japan’s current Spiral Guardian HP.'),
].map(command => command.toJSON())

const rest = new REST({ version: '9' }).setToken(token)

for (const [guildName, guildId] of Object.entries(guildIds)) {
	// rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
	// 	.then(() => console.log(`Successfully registered application commands for: ${guildName}`))
	// 	.catch(console.error)
	(async () => {
		const commands: any = await rest.get(Routes.applicationGuildCommands(clientId, guildId))
		for (const command of commands)
			rest.delete(`${Routes.applicationGuildCommands(clientId, guildId)}/${command.id}`).catch(console.error)
	})().catch(console.error)
}
