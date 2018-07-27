let Discord = require(`discord.js`);
let Promise = require('bluebird');
//let Chunk = require('node-text-chunk');
let Client = new Discord.Client();
let Moons = require(`./src/Moons2.js`);
let Config = require(`./config.json`);
let Utilities = require(`./src/Utilities.js`);



const DISCORD_MESSAGE_LENGTH = 1800;

Client.on('ready', () => {
  console.log(`\nBot has started, with ${Client.users.size} users, in ${Client.channels.size} channels of ${Client.guilds.size} guilds.`); 
});

Client.on('message', msg => {
  if(msg.author.bot) return;
  if(msg.content.indexOf(Config.prefix) !== 0) return;
  
  var args = msg.content.slice(Config.prefix.length).trim().split(/ +/g);
  var command = args.shift().toLowerCase();
  var search = '';
  if(args.length > 0)
    search = args.shift().toLowerCase();
  console.log(`\nCommand received: ${command}, with arguments: ${args.join(', ')}, from user ${msg.author}.`);

  switch(command)
  {
    case "help":
      msg.channel.send(`\`\`\`${Config.helpMessage}\`\`\``);
      break;
    case "owned":
      Moons.GetOwnedMoons(search)
        .then(moons => Utilities.SplitString(moons,DISCORD_MESSAGE_LENGTH))
        .then(messages => messages.forEach(message => msg.author.sendMessage(`\`\`\`${message}\`\`\``)))
        .catch(err => msg.author.sendMessage(`:x: ${err}`));
      break;
    case "inactive":
      Moons.GetInactiveMoons()
        .then(moons => msg.author.sendMessage(moons))
        .catch(err =>  msg.author.sendMessage(`:x: ${err}`));
      break;
    case "schedule":
      Moons.GetScheduledMoons(search)
      .then(moons => msg.author.sendMessage(moons))
      .catch(err =>  msg.author.sendMessage(`:x: ${err}`));
      break;
  }
});

Client.login(process.env.token);
