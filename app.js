let Discord = require(`discord.js`);
let Promise = require('bluebird');
let Client = new Discord.Client();
let Config = require(`./data/config.json`);
let Schedule = require('cron-scheduler');
let Commands = require('./src/commands.js');
let Utilities = require('./src/utilities.js');
let Messages = require('./src/messages.js');

Client.on('ready', () => {
  Schedule({ on: '0 * * * *'}, function () {
    return Commands.ScheduledHours(1)
      .then(m => Client.channels.find('name', Config.notification_channel).send(m))
      .catch(console.log);
  });
  console.log(Messages.Startup(Client.users.size, Client.channels.size, Client.guilds.size));
});

Client.on('message', msg => {
  if(msg.author.bot) return;
  if(msg.content.indexOf(Config.prefix) !== 0) return;
  
  var args = msg.content.slice(Config.prefix.length).trim().split(/ +/g);
  var command = args.shift().toLowerCase();
  var param = '';
  if(args.length > 0)
    param = args.shift().toLowerCase();
  console.log(`\nCommand received: ${command}, with arguments: ${args.join(', ')}, from user ${msg.author}.`);

  switch(command)
  {
    case 'help':
      Commands.Help()
        .then(msg.channel.send)
        .catch(err => msg.channel.send(`:x: ${err}`));
      break;
    case 'owned':
      Commands.Owned(param)
        .then(Utilities.SplitString)
        .then(msg.author.send)
        .catch(err => msg.channel.send(`:x: ${err}`));
      break;
    case 'inactive':
      Commands.Inactive(param)
        .then(Utilities.SplitString)
        .then(msg.author.send)
        .catch(err => msg.channel.send(`:x: ${err}`));
      break;
    case 'schedule':
      Commands.Schedule(param)
        .then(Utilities.SplitString)
        .then(msg.author.send)
        .catch(err => msg.channel.send(`:x: ${err}`));
      break;
    case 'values':
      Commands.Values(param)
        .then(Utilities.SplitString)
        .then(msg.author.send)
        .catch(err => msg.channel.send(`:x: ${err}`));
      break;
    case 'announce':
      Commands.ScheduledHours(param)
        .then(Utilities.SplitString)
        .then(msg.author.send)
        .catch(err => msg.channel.send(`:x: ${err}`));
      break;
  }
});

Client.login(process.env.token);
