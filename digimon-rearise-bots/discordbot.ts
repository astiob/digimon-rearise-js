import {Client, Intents, MessageEmbed} from 'discord.js'
import type {InteractionReplyOptions, WebhookMessageOptions} from 'discord.js'

import * as api from './apitypes'
import {DigiriseError, DigiriseSession, ResponsePromise, User, error, log, mainJpUser} from './client'
import {mprId, token} from './config.json'
import {Masters, Server, servers} from './server'
import * as t9n from './translation'

let sessionPromise = DigiriseSession.createSlim(servers.jp, mainJpUser)

async function gsj(): Promise<InteractionReplyOptions & WebhookMessageOptions> {
	if (!mprId) {
		return {content: 'vs. Guardians is not active at the moment.'}
	}
	const maxAttempts = 3
	for (let attempt = 1; ; ++attempt) {
		const session = await sessionPromise
		try {
			const mprTop = await session.mprTop(mprId)
			const mprQuest = mprTop.mprQuestList[mprTop.mprQuestList.length - 1]!
			const response = mprTop._response
			const currentHp = new Intl.NumberFormat('en').format(mprQuest.bossCurrentHp)
			const hpLeft = (mprQuest.bossCurrentHp * 100 / mprQuest.bossTotalHp).toFixed(2) + '%'
			return {embeds: [new MessageEmbed()
				.setTitle('G-Spiral-6097')
				.setURL('https://chortos.selfip.net/digimonrearise/mpr/1120')
				// .setAuthor({ name: 'Some name', iconURL: 'https://i.imgur.com/AfFp7pu.png', url: 'https://discord.js.org' })
				// .setDescription(`Current HP: ${currentHp}\nHP left: ${hpLeft}`)
				.setThumbnail('https://cdn.discordapp.com/attachments/725867643755823111/944772680366837830/spiralface2097616.png')
				// .setImage('https://chortos.selfip.net/digimonrearise/mpr/1120050')
				.addFields(
					{ name: 'Current HP', value: currentHp, inline: false },
					{ name: 'HP left', value: hpLeft, inline: false },
				)
				.setTimestamp((response.timings.upload! + response.timings.response!) / 2)
				// .setFooter({ text: 'Some footer text here', iconURL: 'https://i.imgur.com/AfFp7pu.png' })
			]}
		} catch (e) {
			if (attempt < maxAttempts && e instanceof DigiriseError) {
				switch (e.response.errorNumber) {
				case api.ErrorNumber.MaintenanceAll:
				case api.ErrorNumber.MaintenanceApi:
				case api.ErrorNumber.ExecuteOutOfPeriod:
					break
				case api.ErrorNumber.MasterOrResourceUpdate:
					await session.initializeSlim()
					continue
				case api.ErrorNumber.ServerError:
					sessionPromise = DigiriseSession.createSlim(servers.jp, mainJpUser)
					continue
				}
			}
			throw e
		}
	}
}

const client = new Client({
	intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
	presence: {
		activities: [
			{
				name: 'Digimon ReArise (Japan)',
				type: 'WATCHING',
			},
		],
	},
})

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return

	const {commandName} = interaction

	switch (commandName) {
		case 'gsj':
			const replyPromise = gsj()
			await interaction.deferReply()
			await interaction.editReply(await replyPromise)
			break
	}
})

client.on('messageCreate', async message => {
	// console.log(message)
	switch (message.content) {
		case '/gsj':
			await message.reply({
				...await gsj(),
				allowedMentions: { repliedUser: false },
			})
			break
	}
})

client.once('ready', () => {
	log('Ready!')
})

function handleSignal(signal: NodeJS.Signals) {
	client.destroy()
	process.off('SIGHUP', handleSignal)
	process.off('SIGINT', handleSignal)
	process.off('SIGTERM', handleSignal)
	if (signal)
		process.kill(process.pid, signal)
}
process.on('SIGHUP', handleSignal)
process.on('SIGINT', handleSignal)
process.on('SIGTERM', handleSignal)

client.login(token)
