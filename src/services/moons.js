let DateDiff = require(`date-diff`);
let Promise = require('bluebird');

let Config = require('../../data/config.json');

let Esi = require('../repositories/esi.js');
let Extractions = require('../repositories/extractions.js');
let Observers = require('../repositories/observers.js');
let OreValue = require('./ore-value.js');

let Moons = require('../../data/eve/moons.json');

module.exports = {
  /**
   * Gets a promise yielding the currently extracing moons
   * @returns A promise returning an array of objects of the following format:
   * [
   *  {
   *    moon: [object],
   *    hrsTotal: float,
   *    hrsRemaining: float
   *  }
   * ]
   */
  Extracting: () => {
    let tokenPromise = Esi.RefreshToken(process.env.refresh_token);
    let extractionsPromise = tokenPromise.then(Extractions.Get);

    return extractionsPromise
      .then(extractions => {
        let ids = extractions.map(e => e.moon_id.toString());
        let extractingMoons = Moons.filter(m => ids.indexOf(m.moonID) >= 0);
        let uniqueIds = Array.from(new Set(extractingMoons.map(m => m.moonID)));

        return uniqueIds.map(id => {
          let moon = Moons.find(m => m.moonID == id);
          let extraction = extractions.filter(e => e.moon_id == id)[0];
          let chunkArrivalTime = Date.parse(extraction.chunk_arrival_time);
          let extractionStartTime = Date.parse(extraction.extraction_start_time);

          let now = new Date();
          let hrsTotal = new DateDiff(chunkArrivalTime, extractionStartTime);
          let hrsRemaining = new DateDiff(chunkArrivalTime, now);

          return {
            moon: moon,
            hrsTotal: hrsTotal.hours(),
            hrsRemaining: hrsRemaining.hours()
          };
        });
      });
  },

  /**
   * Gets a promise yielding Extraction and ore info
   * @returns a promise
   */
  ExtractingOres: () => {
    let orePromise = OreValue.Get('jita');
    let extractingPromise = module.exports.Extracting();

    return Promise.join(orePromise, extractingPromise, (values, moonData) => {
      return moonData.map(data => {
        let ores = Moons
          .filter(m => m.name === data.moon.name)
          .map(m => {
            let item = values.find(v => v.name === m.product);
            return {
              product: m.product,
              quantity: m.quantity,
              value: item.value,
              volume: item.volume
            };
          });

        return {
          name: data.moon.name,
          hrsRemaining: data.hrsRemaining,
          hrsTotal: data.hrsTotal,
          ores: ores
        };
      });
    });
  },

  Inactive: () => {
    let tokenPromise = Esi.RefreshToken(process.env.refresh_token);
    //let extractionsPromise = tokenPromise.then(Extractions.Get);
    let observersPromise = tokenPromise.then(Observers.Get);
    let observedPromise = tokenPromise.then(Observers.GetObserved);
    let observerStructuresPromise = Observers.GetStructures(tokenPromise, observersPromise);

    return Promise.join(observerStructuresPromise, observedPromise, (structures, observed) => {
      let extracted = {}; //get distinct observed structures
      
      let notExtracting = extracted.filter(s => structures.some(i => i == s));
            
      return 'Not Implemented!';
    });
  },

  Owned: (search) => {
    let tokenPromise = Esi.RefreshToken(process.env.refresh_token);
    let extractionsPromise = tokenPromise.then(Extractions.Get);

    return extractionsPromise.then(extractions => {
      let extractingMoons = Array.from(new Set(Moons.map(m => {
        return {
          name: m.name,
          extracting: extractions.some(e => e.moon_id === m.moonID)
        };
      })));

      let moons = extractingMoons.map(m => {
        let ores = Moons
          .filter(i => i.name === m.name)
          .map(i => { return { product: i.product, quantity: i.quantity }});

        return { name:m.name, extracting: m.extracting, ores: ores };
      });

      if(search != '') {
        let re = new RegExp(search, 'i');
        moons = moons.filter(i => re.test(i.ToString));
      }
      
      return moons;
    });
  }
}