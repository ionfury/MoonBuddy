let Promise = require('bluebird');
let DB = require(`./db.js`);

module.exports = {
  RefreshExtractionsData:refreshExtractionsData
}

function refreshExtractionsData(getObservers, getExtractions) {
  return Promise.join(getObservers, getExtractions, (observers, extractions) => {
    return Promise.map(extractions, extraction => DB.ExtractionAdd(extraction));
  });
}