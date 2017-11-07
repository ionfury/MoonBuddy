let Config = require(`../config.json`);
let Promise = require('bluebird');
let Api = require(`./Api.js`);
let dateFormat = require('dateformat');

/*
function getUniqueNames() {
  return Promise.join(getAccessToken(), getObserved(), (accessToken, observed) => 
  {
    var promises = [];

    observed.forEach(observer => 
      observer.forEach(observed => 
        promises.push(
          Api.EsiGet({token:accessToken, route:`characters/${observed.character_id}/`})
          .then(JSON.parse))));

    return Promise.all(promises);
  });
}*/

function getMoonStatusText() {
  let getAccessToken = Api.RefreshToken(process.env.refresh_token).then(x => {return x.access_token});
  let getExtractions = getAccessToken
    .then(token => Api.EsiGet({token:token, route:`corporation/${Config.corporation_id}/mining/extractions/`}))
    .then(JSON.parse);
  let getExtractionStructures = Promise.join(getAccessToken, getExtractions, (accessToken, extractions) => {
    var promises = [];
    
    extractions.forEach(extractor => 
      promises.push(
        Api.EsiGet({token:accessToken, route:`universe/structures/${extractor.structure_id}/`})
        .then(JSON.parse)));

    return Promise.all(promises);
  });

  return Promise.join(getAccessToken, getExtractions, getExtractionStructures, (accessToken, extractions, extractionStructures) => {
    return extractionStructures.map((structure, index) => {
      var extraction = extractions[index];
      extractionStartTime = Date.parse(extraction.extraction_start_time);
      chunkArrivalTime = Date.parse(extraction.chunk_arrival_time);
      naturalDecayTime = Date.parse(extraction.natural_decay_time);

      var brewTime = Math.round((chunkArrivalTime - extractionStartTime)/60000/60*20000);
      var arrival = dateFormat(chunkArrivalTime, "yyyy-mm-dd h:MM:ss");
      var now = new Date();
      var remaining = Math.round((chunkArrivalTime - now)/60000/60);

      var displayString = `${structure.name} - ${brewTime.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} m/3 @ ${arrival} (${remaining} hours)`;
      
      var ores = "";

      var moon = Config.moons.find(moon => {
        return moon.name.substring(0,5) === structure.name.substring(0,5);
      });

      ores = "\t" + moon.ores.map(ore => `${ore.ore} - ${Math.round(ore.amount*100,2)}%`).reduce((acc, val) => acc + `\n\t${val}`);

      return {"displayString":displayString, "remaining":remaining, "moon":moon};
    })
    .sort((a, b) => {
      return a.remaining - b.remaining;
    })
    .map(element => {
      var ores = element.moon.ores.map(ore => `${ore.ore} - ${Math.round(ore.amount*100,2)}%`).reduce((acc, val) => acc + `\n\t${val}`);
      var display = `\`\`\`${element.displayString}\n\t${ores}\`\`\``;
      return display;
    });
  });
}

function getChunksMined(){
  let getAccessToken = Api.RefreshToken(process.env.refresh_token).then(x => {return x.access_token});
  let getObservers = getAccessToken
    .then(token => Api.EsiGet({token:token, route:`corporation/${Config.corporation_id}/mining/observers/`}))
    .then(JSON.parse);
  let getObserved = Promise.join(getAccessToken, getObservers, (accessToken, observers) => 
  {
    var promises = [];
    
    observers.forEach(observer => 
      promises.push(Api.EsiGet({token:accessToken, route:`corporation/${Config.corporation_id}/mining/observers/${observer.observer_id}/`})
        .then(JSON.parse)));

    return Promise.all(promises);
  });
  let getUniqueVolumes = Promise.join(getAccessToken, getObserved, (accessToken, observed) => {
    var flattened = observed.reduce((prev, curr) => prev.concat(curr))

    var uniqueTypes = [...new Set(flattened.map(item => item.type_id))];
    
    return Promise.map(uniqueTypes, type => Api.EsiGet({token:accessToken, route:`universe/types/${type}`}).then(JSON.parse));
  });
  let getObserverStructures =  Promise.join(getAccessToken, getObservers, (accessToken, observers) => {
    var promises = [];

    observers.forEach(observer => 
      promises.push(
        Api.EsiGet({token:accessToken, route:`universe/structures/${observer.observer_id}/`})
          .then(JSON.parse)));

    return Promise.all(promises);
  });

  return Promise.join(getAccessToken, getObservers, getObserved, getUniqueVolumes, getObserverStructures, (accessToken, observers, observed, uniqueVolumes, observerStructures) => {
        
    var expiredBy = new Date();
    expiredBy.setDate(expiredBy.getDate() - 5); // 5 days ago

    observers.forEach((observer, index) => observed[index] = observed[index].filter(record => {return new Date(record.last_updated) > expiredBy}))

    var volumeMined = observed.map(observation => observation.reduce((accu, curr) => {
      var item = uniqueVolumes.find(x => x.type_id === curr.type_id)

      return Math.round(accu + (item.volume * curr.quantity));
    }, 0));

    var mined = [];

    observerStructures.forEach((item, index) => {
      mined.push(`\`\`\`${item.name} - ${volumeMined[index].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} m/3 mined \`\`\``)
    });

    return mined;
  });
}

module.exports = {
  GetMoonStatusText:getMoonStatusText,
  GetChunksMined:getChunksMined
}
