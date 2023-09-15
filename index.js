const { Client, Intents } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

const prefix = '/';
const kingdoms = ['Kingdom1', 'Kingdom2', 'Kingdom3', 'Kingdom4'];
const kingdomControl = [25, 25, 25, 25];

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'kingdoms') {
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
        message.channel.send({ files: [attachment] });
    }
});

client.login('YOUR_BOT_TOKEN');
