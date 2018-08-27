let RequestPromise = require('request-promise');

let Config = require('../../data/config.json');
let Esi = require('./esi.js');

module.exports = {
  Id: (name, strict = true) => {
    let options = {
      route: 'search',
      parameters: `categories=character&search=${name}&strict=${strict}`
    }

    return Esi.Get(options)
      .then(res => {
        if(!res.character)
          throw new Error(`Character not found for '${name}'!`);
        else
          return res.character.shift();
      });
  },

  Info: (id) => {
    let options = {
      route: `characters/${id}`
    };

    return Esi.Get(options);
  }
}