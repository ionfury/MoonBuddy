let Discord = require(`discord.js`);
let Promise = require('bluebird');
//let Chunk = require('node-text-chunk');
let Client = new Discord.Client();
let Moons = require(`./src/Moons2.js`);
let Config = require(`./config.json`);
let Utilities = require(`./src/Utilities.js`);
let Schedule = require('cron-scheduler');

const DISCORD_MESSAGE_LENGTH = 1800;

function Announce()
{
  return Moons.Announce().then(moons => Client.channels.find("name", "the_succ").send(moons))
}

Client.on('ready', () => {
  Schedule({ on: '0 0 */1 * *'}, function () {
    return Announce();
  });
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
        .then(messages => messages.forEach(message => msg.author.send(`\`\`\`${message}\`\`\``)))
        .catch(err => msg.author.send(`:x: ${err}`));
      break;
    case "inactive":
      Moons.GetInactiveMoons()
        .then(moons => msg.author.send(moons))
        .catch(err =>  msg.author.send(`:x: ${err}`));
      break;
    case "schedule":
      Moons.GetScheduledMoons(search)
        .then(moons => Utilities.SplitString(moons,DISCORD_MESSAGE_LENGTH))
        .then(messages => messages.forEach(message => msg.author.send(message)))
        .catch(err =>  msg.author.send(`:x: ${err}`));
      break;
    case "values":
      Moons.GetOrePrices(search)
        .then(prices => Utilities.SplitString(prices,DISCORD_MESSAGE_LENGTH))
        .then(messages => messages.forEach(message => msg.author.send(`\`\`\`${message}\`\`\``)))
        .catch(err =>  msg.author.send(`:x: ${err}`));
      break;
    case "announce":
      Moons.Announce()
        .then(moons => msg.channel.send(moons))
        .catch(err => msg.channel.send(`:x: ${err}`));
  }
});

console.log("heyyy");
Client.login(process.env.token);
