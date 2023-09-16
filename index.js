const { Client, GatewayIntentBits, PermissionFlagsBits, Permission, Events, SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const {token} = require('./config.json')

const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent ] });

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
    load_points();
    save_points();
});

client.on('interactionCreate', async interaction => {
    const { commandName } = interaction;
    if (commandName === 'current_kingdom_control') {
        const canvas = createCanvas(500, 500);
        const context = canvas.getContext('2d');

        const colors = ['red', 'green', 'blue', 'yellow'];
        let startAngle = 0;

          kingdomControl.forEach((control, index) => {
            context.fillStyle = colors[index];
            const controlAngle = (control / 10000) * 2 * Math.PI;
            context.beginPath();
            context.moveTo(250, 250);
            context.arc(250, 250, 250, startAngle, startAngle + controlAngle);
            context.lineTo(250, 250);
            context.fill();
            startAngle += controlAngle;
});

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'kingdom-control.png' });
        interaction.reply({ files: [attachment] });
    }
});

function save_points(){
    let data = '';
    for (const [kingdom, points] of Object.entries(kingdom_points)){
        data += '${kingdom}:${points}\n';
    }
    fs.writeFileSync('kingdom_points.txt', data);
}

function load_points() {
    kingdom_points = {};
    kingdom_points.forEach(({ kingdom }) => {
      kingdom_points[kingdom] = 0;
    });
  
    if (fs.existsSync('kingdom_points.txt')) {
      const lines = fs.readFileSync('kingdom_points.txt', 'utf-8').split('\n');
      for (const line of lines) {
        const [kingdom, points] = line.split(':');
        if (kingdom && points && kingdom_points.hasOwnProperty(kingdom)) {
          kingdom_points[kingdom] = parseInt(points, 10);
        }
      }
    }
  }

client.login(token);
