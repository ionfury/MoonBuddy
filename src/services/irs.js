let Promise = require('bluebird');
let GroupArray = require('group-array');

let Characters = require('../repositories/characters.js');
let TestGrpc = require('../repositories/test-grpc.js');
let Types = require('../repositories/types.js');

module.exports = {
  Tax: (name, corpId, begin, end) => {
    let charIdPromise = Characters.Id(name);
    let ledgerPromise = TestGrpc
      .GetCorpLedger(corpId, begin, end)
      .then(arr => arr.map(i => i.entry));

    let minedIdsPromise = ledgerPromise
      .then(l => Array.from(new Set(l.map(e => e.type_id))));

    let minedNamesPromise = Promise.map(minedIdsPromise, type => Types.Info(type)).then(a => a.map(i => i.name));

    let minedPromise = Promise.join(charIdPromise, ledgerPromise, (id, ledger) => {
      let authId = ledger.find(a => a.character_id == id).auth_id;

      if(!authId)
        throw new Error(`No mining entries found for ${name} (id:${id})!`);

      let authMined = ledger.filter(e => e.auth_id == authId);
      let grouped = GroupArray(authMined, 'character_id', 'type_id');

      for(let char in grouped) {
        let mined = grouped[char];
        for(let ores in mined) {
          let arr = mined[ores]
            .map(i => parseInt(i.quantity))
            .reduce((a, b) => a + b, 0);
          mined[ores] = arr;
        }
      }

      return grouped;
    });

    let charNamesPromise = minedPromise
      .then(arr => Object.keys(arr))
      .then(ids => Promise.map(ids, id => Characters.Info(id)))
      .then(chars => chars.map(c => c.name));

    return Promise.join(minedPromise, charNamesPromise, minedIdsPromise, minedNamesPromise, (mined, chars, ids, names) => {
      let obj = {};
      let keys = Object.keys(mined);

      for(let char in chars) {
        let name = chars[char];
        let key = keys[char];
        let minedOre = mined[key];

        let minedObj = {};
        let minedKeys = Object.keys(minedOre);
        for(let idIndex in minedKeys) {
          let typeId = minedKeys[idIndex];
          let index = ids.indexOf(typeId);
          let name = names[index];
          let qty = minedOre[typeId];
          minedObj[name] = qty;
        }

        obj[name] = minedObj;
      }

      return obj;
    });  
  }
}