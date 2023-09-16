const { Client, GatewayIntentBits, PermissionFlagsBits, Permission, Events, SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const {token} = require('./config.json')

const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent ] });

let kingdom_points = {};

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
        const canvasHeight = 500;
        const canvasWidth = 500;
        const squareSize = 10; 
        const rows = canvasHeight / squareSize;
        const cols = canvasWidth / squareSize;
        const totalSquares = rows * cols;
        
        let grid = Array(rows).fill(null).map(() => Array(cols).fill(null));
        
        function getUnclaimedNeighbors(x, y) {
            let neighbors = [];
            [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => {
                let nx = x + dx;
                let ny = y + dy;
                if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && !grid[ny][nx]) {
                    neighbors.push([nx, ny]);
                }
            });
            return neighbors;
        }
        
        const totalControl = Object.values(kingdom_points).reduce((a, b) => a + b, 0);

        Object.entries(kingdom_points).forEach(([kingdom, control], idx) => {
            let allocated = 0;
        
            let targetSquares = Math.round((control / totalControl) * totalSquares);
            
            let startX = Math.floor(Math.random() * cols);
            let startY = Math.floor(Math.random() * rows);
        
            let kingdomCells = [[startX, startY]];
            grid[startY][startX] = kingdom;
        
            while (allocated < targetSquares - 1) {
                if (kingdomCells.length === 0) {
                    // All cells are surrounded, no room to expand further
                    break;
                }
        
                let randomCellIndex = Math.floor(Math.random() * kingdomCells.length);
                let [cellX, cellY] = kingdomCells[randomCellIndex];
        
                let neighbors = getUnclaimedNeighbors(cellX, cellY);
                if (neighbors.length) {
                    let [nx, ny] = neighbors[Math.floor(Math.random() * neighbors.length)];
                    grid[ny][nx] = kingdom;
                    kingdomCells.push([nx, ny]);
                    allocated++;
                } else {
                    kingdomCells.splice(randomCellIndex, 1);
                }
            }
        });
        
        // Drawing the grid on the canvas
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const kingdom = grid[y][x];
                const colorIndex = Object.keys(kingdom_points).indexOf(kingdom);
                context.fillStyle = colors[colorIndex];
                context.fillRect(x * squareSize, y * squareSize, squareSize, squareSize);
            }
        }
        

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'kingdom-control.png' });
        interaction.reply({ files: [attachment] });
    }
});

function save_points(){
  let data = '';
  for (const [kingdom, points] of Object.entries(kingdom_points)){
      data += `${kingdom}:${points}\n`;
  }
  fs.writeFileSync('kingdom_points.txt', data);
}

function load_points() {
  if (fs.existsSync('kingdom_points.txt')) {
    const lines = fs.readFileSync('kingdom_points.txt', 'utf-8').split('\n');
    for (const line of lines) {
      const [kingdom, points] = line.split(':');
      if (kingdom && points) {
        kingdom_points[kingdom] = parseInt(points, 10);
      }
    }
  }
}


client.login(token);
