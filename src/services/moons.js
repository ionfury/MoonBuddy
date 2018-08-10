let Config = include('data/config.json');
let Moons = include('data/eve/moons.json');

let Esi = include('src/repositories/esi.js');
let Extractions = include('src/repositories/extractions.js');
let Observers = include('src/repositories/observers.js');
let OreValue = include('src/services/ore-value.js');

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
  Extracting = () => {
    let tokenPromise = Esi.RefreshToken(process.env.refresh_token);
    let extractionsPromise = tokenPromise.then(Extractions.Get);

    return extractionsPromise
      .then(extractions => {
        let ids = extractions.map(e => e.moon_id.toString());
        let extractingMoons = Moons.filter(m => ids.indexOf(m.moonID) >= 0);
        let uniqueIds = Array.from(new Set(extractingMoons.map(m => m.moonID)));

        return uniqueIds.map(id => {
          let moon = Moons.find(m => m.moonID == id);
          let extraction = extractions.filter(e => e.moon_id == id);
          let chunkArrivalTime = new Date(extraction.chunk_arrival_time);
          let extractionStartTime = new Date(extraction.extraction_start_time);

          let now = new Date();
          let hrsTotal = new DateDiff(chunkArrivalTime, extractionStartTime);
          let hrsRemaining = new DateDiff(chunkArrivalTime, now);

          return {
            moon: moon,
            hrsTotal: hrsTotal.hours(),
            hrsRemaining: hrsRemaining.hours()
          }
        });
      });
  },

  /**
   * Gets a promise yielding Extraction and ore info
   * @returns a promise
   */
  ExtractingOres = () => {
    let orePromise = OreValue.Get('jita');
    let extractingPromise = this.Extracting();

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
          }});

        return {
          name: data.moon.name,
          hrsRemaining: data.hrsRemaining,
          hrsTotal: data.hrs.Total,
          ores: ores
        };
      });
    });
  },

  Inactive = () => {
    let tokenPromise = Esi.RefreshToken(process.env.refresh_token);
    let extractionsPromise = tokenPromise.then(Extractions.Get);
    let observersPromise = tokenPromise.then(Observers.Get);
    let observerStructuresPromise = Observers.GetStructures(tokenPromise, observersPromise);

    return Promise.join(observerStructuresPromise, extractionsPromise, (observerStructuresPromise, extractions) => {
      console.log(observerStructures, extractions);

      return 'Not Implemented!';
    });
  }
}