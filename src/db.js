let MongoClient = require('mongodb').MongoClient;
let Promise = require('bluebird');
let Config = require(`./../config.json`);
Promise.promisifyAll(MongoClient);

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
