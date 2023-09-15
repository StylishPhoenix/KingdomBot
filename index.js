const { Client, GatewayIntentBits, PermissionFlagsBits, Permission, Events, SlashCommandBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const {token} = require('./config.json')

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent ] });

const prefix = '/';
const kingdoms = ['Kingdom1', 'Kingdom2', 'Kingdom3', 'Kingdom4'];
const kingdomControl = [25, 25, 25, 25];
const currentKingdomControl = new SlashCommandBuilder()
    .setName('current_kingdom_control')
    .setDescription('Shows current kingdom control');
const commands =  [
    currentKingdomControl.toJSON(),
];


client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    await client.application.commands.set(commands);
    console.log('Commands registered.')
});

client.on('interactionCreate', async interaction => {
    const { commandName } = interaction;
    if (commandName === 'kingdoms') {
        const canvas = createCanvas(500, 500);
        const context = canvas.getContext('2d');

        const colors = ['red', 'green', 'blue', 'yellow'];
        let startAngle = 0;

          kingdomControl.forEach((control, index) => {
            context.fillStyle = colors[index];
            const controlAngle = (control / 100) * 2 * Math.PI;
            context.beginPath();
            context.moveTo(250, 250);
            context.arc(250, 250, 250, startAngle, startAngle + controlAngle);
            context.lineTo(250, 250);
            context.fill();
            startAngle += controlAngle;
});

        const attachment = new Discord.MessageAttachment(canvas.toBuffer(), 'kingdom-control.png');
        interaction.deferReply();
        interaction.editReply({ files: [attachment] });
    }
});

client.login(token);
