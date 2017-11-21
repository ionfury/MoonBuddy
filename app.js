let Discord = require(`discord.js`);
let Promise = require('bluebird');
let Client = new Discord.Client();
let Moons = require(`./src/Moons.js`);
let Config = require(`./config.json`);

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
      .then(x => {
        msg.channel.send(x)
      })
      .catch(err => msg.channel.send(err));
  }

  if(command === "mined") {
    Moons.GetChunksMined()
      .then(x => {
        let messages = [];
        let i = 0;

        do
        {
          messages.push(x.slice(i, i+3));
          i = i + 3;
        } while(i < x.length) 

        return Promise.map(messages, message => msg.channel.send(`.\n${message}`));
      })
      .catch(err => msg.channel.send(`**Error**:\n${err}`));
  }

  if(command === "help") {
    msg.channel.send(`Try ${Config.prefix}moons (moon extraction timers) or ${Config.prefix}mined (moon mining in the last 5 days).`)
  }
});

Client.login(process.env.token);