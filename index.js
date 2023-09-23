const { Client, GatewayIntentBits, PermissionFlagsBits, Permission, Events, SlashCommandBuilder, AttachmentBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const {token, guildID } = require('./config.json')
const userPointsData = {};
const Database = require('better-sqlite3');

const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent ] });

const db = new Database('./points_log.db');
createTableIfNotExists(db);

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
    const guild = client.guilds.cache.get(guildID);
    if (guild) {
        updateVoiceChannelPoints(guild, client);
    } else {
        console.error(`Guild not found with ID: ${guildID}`);
    }
});

client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;
    const userId = message.author.id;
    const kingdom = await getUserKingdom(message.guild, userId)
    if (!kingdom) return;
    calculatePoints(userId, kingdom, message.content);
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
        
        const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
        
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

        const corners = [
            [Math.floor(cols * 0.1), Math.floor(rows * 0.1)], // top left
            [Math.floor(cols * 0.9), Math.floor(rows * 0.1)], // top right
            [Math.floor(cols * 0.1), Math.floor(rows * 0.9)], // bottom left
            [Math.floor(cols * 0.9), Math.floor(rows * 0.9)], // bottom right
        ];
        
        Object.entries(kingdom_points).forEach(([kingdom, control], idx) => {

            let allocated = 0;
        
            let targetSquares = Math.round((control / totalControl) * totalSquares);
        
            if(targetSquares <= 0) {
                return;
            }
        
            let [startX, startY] = corners[idx];
            
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
        
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const kingdom = grid[y][x];
                if(!kingdom) {
                    console.log(`Unallocated cell at [${x}, ${y}]`);
                }
                const colorIndex = Object.keys(kingdom_points).indexOf(kingdom);
                context.fillStyle = colors[colorIndex];
                context.fillRect(x * squareSize, y * squareSize, squareSize, squareSize);
            }
        }        
        

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'kingdom-control.png' });
        interaction.reply({ files: [attachment] });
    }
});
function calculatePoints(userId, kingdom, message){
    const now = Date.now();
     if(!userPointsData.hasOwnProperty(userId)){
        userPointsData[userId] = {
        lastMessageTimestamp: Date.now() - 60000,
        points: 0,
        messageInCurrentInterval: 0,
        pointsScheduled: false,
        }
     };
     if(message.length < 10) {
        userPointsData[userId].lastMessageTimestamp = now;
        return;
     }
     const elaspedTime = now - userPointsData[userId].lastMessageTimestamp;
     if(elaspedTime < 30000){
        userPointsData[userId].lastMessageTimestamp = now;
        return;
     }
     if (userPointsData[userId].messageInCurrentInterval < 5){
        userPointsData[userId].points += 10;
     }
    
     userPointsData[userId].messageInCurrentInterval++;

     userPointsData[userId].lastMessageTimestamp = now;

     if (userPointsData[userId].points > 50) {
        userPointsData[userId].points = 50;
     }
    if (!userPointsData[userId].pointsScheduled){
        scheduleAddPoints(userId, kingdom);
    }

}

async function updateVoiceChannelPoints(guild, client) {
    client.on('voiceStateUpdate', async (oldState, newState) => {
      const userId = newState.id;
      const oldChannel = oldState.channel;
      const newChannel = newState.channel;
      const timeInterval = 10;
      const pointsPerInterval = 10;
      const minimumVoice = 3;
  
      if (oldChannel !== newChannel || oldState.mute !== newState.mute || oldState.deaf !== newState.deaf) {
        if (oldChannel) {
          // User left a voice channel or switched to another channel
          const kingdom = await getUserHouse(guild, userId);
          if (kingdom) {
            const startTime = userVoiceTimes[userId];
            const currentTime = Date.now();
          
       if (startTime && !isNaN(startTime)) { // Check if startTime is valid
            const timeSpent = currentTime - startTime;
  
            // Calculate points based on time spent in the voice channel
            const points = Math.floor(timeSpent / timeInterval) * pointsPerInterval;
  
            // Add points and log them
            addPointsForUser(kingdom, points);
            // await logPoints(userId, kingdom, points, 'Voice Channel Points');
       }
            // Remove the user's entry from userVoiceTimes
            delete userVoiceTimes[userId];
          }
        }
  
        if (newChannel) {
          // User joined a voice channel
          const humanMembers = newChannel.members.filter(member => !member.user.bot && !member.voice.mute && !member.voice.deaf);
          if (humanMembers.size >= minimumVoice) {
            userVoiceTimes[userId] = Date.now();
          }
        }
      }
    });
  }  

function scheduleAddPoints(userId, kingdom){
    userPointsData[userId].pointsScheduled = true;
    setTimeout(() => {
        const earnedPoints = userPointsData[userId].points;
        userPointsData[userId].points = 0;
        userPointsData[userId].messageInCurrentInterval = 0;
        addPointsForUser(kingdom, earnedPoints);
        userPointsData[userId].pointsScheduled = false;
    }, 1000);
}

function createTableIfNotExists(db) {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS point_history (
        id INTEGER PRIMARY KEY,
        user_id TEXT NOT NULL,
        kingdom TEXT NOT NULL,
        points INTEGER NOT NULL,
        reason TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );
    `;
  
    db.exec(createTableQuery);
  } 

  async function logPoints(userId, kingdom, points, reason) {
    const timestamp = Date.now();
    if (points == 0) return;
    db.prepare(`INSERT INTO point_history (user_id, kingdom, points, reason, timestamp) VALUES (?, ?, ?, ?, ?)`).run(userId, kingdom, points, reason, timestamp);
  }

function addPointsForUser(kingdom, points){
    if (kingdom_points.hasOwnProperty(kingdom)){
        kingdom_points[kingdom] += points;
        let viableKingdoms = Object.keys(kingdom_points);
        viableKingdoms = viableKingdoms.filter( k => k !== kingdom);
        const randomKingdom = viableKingdoms[Math.floor(Math.random() * viableKingdoms.length)];
        kingdom_points[randomKingdom] -= points;
        save_points();
    }
}
async function getUserKingdom(guild, userId){
    const member = await guild.members.fetch(userId);
    
    for(const role of member.roles.cache.values()){
        if(kingdom_points.hasOwnProperty(role.name)){
            return role.name;
        }
    }

    return null;
}

async function displayLeaderboard(interaction, kingdom, client, currentPage) {
    // Retrieve the leaderboard data from the database
  const leaderboardData = await getLeaderboardData(kingdom);

  // Sort the data in decreasing order of points contributed
  leaderboardData.sort((a, b) => b.points - a.points);
  const limit = 10;
  const totalPages = Math.ceil(leaderboardData.length / limit);
  const startIndex = currentPage * limit;
  const footer = { text: `Page ${currentPage + 1} of ${totalPages}` };
  const userID = interaction.user.id;
  // Format the leaderboard data
  const splitLeaderboardPromises = leaderboardData
    .slice(startIndex, startIndex + limit)
    .map(async (entry, index) => {
      const user = await client.users.fetch(entry.user_id);
      return `${index + 1 + startIndex}. User: ${user}, Points: ${entry.points}`;
    });
  const splitLeaderboard = await Promise.all(splitLeaderboardPromises);
  const formattedLeaderboard = splitLeaderboard.join('\n\n');

  // Create the embed
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(`${kingdom} Leaderboard`)
    .setDescription(formattedLeaderboard)
    .setFooter(footer);

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`leaderboard_prev_${currentPage}_${totalPages}_${kingdom}_${kingdom}_${userID}`)
        .setLabel('Previous')
        .setStyle('1')
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId(`leaderboard_next_${currentPage}_${totalPages}_${kingdom}_${kingdom}_${userID}`)
        .setLabel('Next')
        .setStyle('1')
        .setDisabled(currentPage === totalPages - 1)
    );

  // Send the embed as a reply
  return { embeds: [embed], components: [row] };
    }


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
