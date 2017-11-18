let MongoClient = require('mongodb').MongoClient;
let Promise = require('bluebird');
let Config = require(`./../config.json`);
Promise.promisifyAll(MongoClient);

const connectionUrl = `mongodb://${process.env.database_username}:${process.env.database_password}@${process.env.database_connection_string}`;

module.exports = {
  ExtractionGet: extractionGet,
  ExtractionAdd: extractionUpsert
}

/**
 * Opens and closes a connection to a remote mongodb database.
 * @param {*string} url - The connection string for mongodb.
 */
function getMongoConnection(url) {
  return MongoClient.connect(url, { promiseLibrary: Promise })
    .disposer(conn => conn.close());
}

function extractionUpsert(extraction) {
  return new Promise.using(getMongoConnection(connectionUrl), conn => {
    var query = { 
      structure_id: extraction.structure_id,
      moon_id: extraction.moon_id
    };

    var values = { 
      structure_id: extraction.structure_id,
      moon_id: extraction.moon_id,
      extraction_start_time: extraction.extraction_start_time,
      chunk_arrival_time: extraction.chunk_arrival_time,
      natural_decay_time: extraction.natural_decay_time
    };
    var options = { upsert: true };
     
    return conn.collection('extractions').updateOne(query, values, options);
  });
}

function extractionGet(extraction) { 
  return new Promise.using(getMongoConnection(connectionUrl), conn => {
    var query = { 
      structure_id: extraction.structure_id,
      moon_id: extraction.moon_id
    };
    return conn.collection('extractions').findOne(query);
  });
}
