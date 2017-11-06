const Config = require(`../config.json`);
const Promise = require('bluebird');
const ESI = require('eve-swagger');
const Api = require(`./Api.js`);
const RequestPromise = require('request-promise');
const dateFormat = require('dateformat');
const SUAD = 1091440439;

var getAllObservations = (token,corp,observers) => {
  var promises = [];

  observers.forEach(observer => promises.push(Api.Observe(token,corp,observer.observer_id)))

  return [token, corp, promises];
}

var accessToken = Api.RefreshToken(process.env.refresh_token)
  .then(x => {return x.access_token});

var observers = accessToken
  .then(token => Api.EsiObservers(token,SUAD))
  .then(JSON.parse);

var observed = Promise.join(accessToken, observers, (accessToken, observers) => {
  
  var promises = [];
  
  observers.forEach(observer => promises.push(Api.EsiObserve(accessToken,SUAD,observer.observer_id).then(JSON.parse)));

  return Promise.all(promises);
});
  
var names = Promise.join(accessToken, observed, (accessToken, observed) => {
  var promises = [];
  observed.forEach(observer => 
    observer.forEach(observed => 
      promises.push(Api.EsiPublicInfo(accessToken, observed.character_id).then(JSON.parse))));

  return Promise.all(promises);
});

var observerStructures = Promise.join(accessToken, observers, (accessToken, observers) => {
  var promises = [];

  observers.forEach(observer => promises.push(Api.EsiStructureInfo(accessToken,observer.observer_id).then(JSON.parse)));

  return Promise.all(promises);
});

var extractions = accessToken.then(token => {
  return Api.EsiExtractions(token,SUAD).then(JSON.parse);
});

var extractionStructures = Promise.join(accessToken, extractions, (accessToken, extractions) => {
  var promises = [];

  extractions.forEach(extractor => promises.push(Api.EsiStructureInfo(accessToken,extractor.structure_id).then(JSON.parse)));

  return Promise.all(promises);
});

var getMoonStatusText = Promise.join(accessToken, extractions, extractionStructures, (accessToken, extractions, extractionStructures) => {
  var display = extractionStructures.map((structure, index) => {
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
      return moon.name.substring(0,5) == structure.name.substring(0,5);
    });

    ores = "\t" + moon.ores.map(ore => `${ore.ore} - ${Math.round(ore.amount*100,2)}%`).reduce((acc, val) => acc + `\n\t${val}`);

    return {"displayString":displayString,"remaining":remaining,"moon":moon};
  })
  .sort((a, b) => {
    return a.remaining - b.remaining;
  })
  .map(element => {
    var ores = element.moon.ores.map(ore => `${ore.ore} - ${Math.round(ore.amount*100,2)}%`).reduce((acc, val) => acc + `\n\t${val}`);
    var display = `${element.displayString}\n\t${ores}`;
    return display;
  });

  return display;
});

module.exports = {
  GetMoonStatusText:getMoonStatusText
}
