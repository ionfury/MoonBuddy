const Config = require(`../config.json`);
const Promise = require('bluebird');
const Api = require(`./Api.js`);
const dateFormat = require('dateformat');

/**
 * Gets an access token
 * @returns a RequestPromise.
 */
const accessToken = Api.RefreshToken(process.env.refresh_token)
  .then(x => {return x.access_token});
  
/**
 * Gets the observers
 * @returns a RequestPromise.
 */
const observers = accessToken
  .then(token => Api.EsiGet({token:token, route:`corporation/${Config.corporation_id}/mining/observers/`}))
  .then(JSON.parse);

/**
 * Gets the observations
 * @returns a RequestPromise.
 */
const observed = Promise.join(accessToken, observers, (accessToken, observers) => 
{
  var promises = [];
  
  observers.forEach(observer => 
    promises.push(Api.EsiGet({token:accessToken, route:`corporation/${Config.corporation_id}/mining/observers/${observer.observer_id}/`})
    .then(JSON.parse)));

  return Promise.all(promises);
});

/**
 * Gets the character names
 * @returns a RequestPromise.
 */
const names = Promise.join(accessToken, observed, (accessToken, observed) => 
{
  var promises = [];

  observed.forEach(observer => 
    observer.forEach(observed => 
      promises.push(
        Api.EsiGet({token:accessToken, route:`characters/${observed.character_id}/`})
        .then(JSON.parse))));

  return Promise.all(promises);
});

/**
 * Gets the observing structures
 * @returns a RequestPromise.
 */
const observerStructures = Promise.join(accessToken, observers, (accessToken, observers) => 
{
  var promises = [];

  observers.forEach(observer => 
    promises.push(
      Api.EsiGet({token:accessToken, route:`universe/structures/${observer.observer_id}/`})
      .then(JSON.parse)));

  return Promise.all(promises);
});

/**
 * Gets the observations
 * @returns a RequestPromise.
 */
const extractions = accessToken.then(token => 
{
  return Api.EsiGet({token:token,route:`corporation/${Config.corporation_id}/mining/extractions/`}).then(JSON.parse);
});

/**
 * Gets the extraction structures
 * @returns a RequestPromise.
 */
const extractionStructures = Promise.join(accessToken, extractions, (accessToken, extractions) => 
{
  var promises = [];
  
  extractions.forEach(extractor => 
    promises.push(
      Api.EsiGet({token:accessToken, route:`universe/structures/${extractor.structure_id}/`})
      .then(JSON.parse)));

  return Promise.all(promises);
});

/**
 * Gets the moon status text
 * @returns a RequestPromise.
 */
const getMoonStatusText = Promise.join(accessToken, extractions, extractionStructures, (accessToken, extractions, extractionStructures) => {
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
});

module.exports = {
  GetMoonStatusText:getMoonStatusText
}
