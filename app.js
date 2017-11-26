let Discord = require(`discord.js`);
let Promise = require('bluebird');
let Client = new Discord.Client();
let Moons = require(`./src/Moons.js`);
let Config = require(`./config.json`);

const MESSAGE_BATCH_SIZE = 3;

Client.on('ready', () => {
  console.log(`\nBot has started, with ${Client.users.size} users, in ${Client.channels.size} channels of ${Client.guilds.size} guilds.`); 
});

Client.on('message', msg => {
  if(msg.author.bot) return;
  if(msg.content.indexOf(Config.prefix) !== 0) return;
  if(!msg.guild) {
    msg.reply(`Please converse with me in a guild channel instead.`);
    return;
  }
  
  var args = msg.content.slice(Config.prefix.length).trim().split(/ +/g);
  var command = args.shift().toLowerCase();
  console.log(`\nCommand received: ${command}, with arguments: ${args.join(', ')}, from user ${msg.author}.`);

  if(command === "moons") {
    Moons.GetMoonStatusText()
      .then(message => send(message, msg.channel.send))
      .catch(err => msg.channel.send(err));
  }

  if(command === "mined") {
    Moons.GetChunksMined()
      .then(message => send(message, msg.channel.send))
      .catch(err => msg.channel.send(`**Error**:\n${err}`));
  }

  if(command === "active") {
    Moons.GetActive()
  }

  if(command === "help") {
    msg.channel.send(`'''` + `${Config.prefix}moons\n${Config.prefix}mined` + `'''`)
  }
});

Client.login(process.env.token);

function Write(func, route) {
  func.then(message => send(message, route))
      .catch(err => route(`**Error**:\n${err}`));
}

function send(message, sender) {
  if(Array.isArray(message)) {
    let messages = [];
    let i = 0;

    do {
      messages.push(sender(message.slice(i, i+MESSAGE_BATCH_SIZE)));
      i = i + MESSAGE_BATCH_SIZE;
    } while(i < message.length);

    return Promise.all(messages);
  } else {
    return sender(message);
  }
}