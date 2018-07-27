let MongoClient = require('mongodb').MongoClient;
let Promise = require('bluebird');
let Config = require(`./../config.json`);
Promise.promisifyAll(MongoClient);
var process = {
  env: {
    client_id:'20d390444f79404ea527fdb4297b14ac',
    client_secret:'2OZcJZAkWUTqN6WqwQYTx69cygdgfqRdNk9egTKX',
    database_password:'-c!4PP&4XxpzLx$k',
    database_username:'alcoholocaust',
    refresh_token:'fcnoTpeSqIixyHBokdy9iwW7FK0nZ9usQe-pmcJzbhJ9fk0Hrp86teRQtKuIbB-n0',
    token:'Mzc3MjMyNDQ5MjU3NjAzMDcy.DOKC-g.NQMZc_cTu9vwt_5i-uAO1dP6ho0',
    database_connection_string:'ds113606.mlab.com:13606/moons'
  }
};

const connectionUrl = `mongodb://${process.env.database_username}:${process.env.database_password}@${process.env.database_connection_string}`;

module.exports = {
  ExtractionGet: extractionGetLatest,
  ExtractionAdd: extractionAdd,
  ExtractionsGet: extractionsGet,
  ExtractionsStructureDateGet: extractionsStructureDateGet,
  ExtractionsStructureGet: extractionsStructureGet
}

/**
 * Opens and closes a connection to a remote mongodb database.
 * @param {*string} url - The connection string for mongodb.
 */
function getMongoConnection(url) {
  return MongoClient.connect(url, { promiseLibrary: Promise })
    .disposer(conn => conn.close());
}

function extractionsGet() {
  return new Promise.using(getMongoConnection(connectionUrl), conn => {
    return conn.collection('extractions').find().sort({"chunk_arrival_time": -1 }).toArray();
  });
}

function extractionGetLatest(extraction) { 
  return new Promise.using(getMongoConnection(connectionUrl), conn => {
    var query = { 
      structure_id: extraction.structure_id
    };
    
    return conn.collection('extractions')
      .find(query)
      .sort({"chunk_arrival_time": -1 })
      .limit(1)
      .toArray()
  }).then(x => x[0]);
}

function extractionsStructureGet(structureID) {
  return new Promise.using(getMongoConnection(connectionUrl), conn => {
    var query = {
      structure_id: structureID,
    };

    return conn.collection('extractions')
      .find(query)
      .sort({"chunk_arrival_time": -1 })
      .toArray();
  });
}

function extractionsStructureDateGet(structureID, date) {
  return new Promise.using(getMongoConnection(connectionUrl), conn => {
    var query = {
      structure_id: structureID,
      chunk_arrival_time: {
        $lt:date.toISOString()
      }
    };

    return conn.collection('extractions')
      .find(query)
      .sort({"chunk_arrival_time": -1 })
      .limit(1)
      .toArray();
  }).then(x => x[0]);
}

function extractionAdd(extraction) {
  return new Promise.using(getMongoConnection(connectionUrl), conn => {
    var query = { 
      structure_id: extraction.structure_id,
      moon_id: extraction.moon_id,
      extraction_start_time: extraction.extraction_start_time,
      chunk_arrival_time: extraction.chunk_arrival_time,
      natural_decay_time: extraction.natural_decay_time
    };

    var values = { 
      structure_id: extraction.structure_id,
      moon_id: extraction.moon_id,
      extraction_start_time: extraction.extraction_start_time,
      chunk_arrival_time: extraction.chunk_arrival_time,
      natural_decay_time: extraction.natural_decay_time
    };

    var options = { upsert: true };
     
    return conn.collection('extractions').update(query, values, options);
  });
}
