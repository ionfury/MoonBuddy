const RequestPromise = require('request-promise');
const Config = require(`./../config.json`);

module.exports = {
  AuthToken: authToken,
  VerifyToken: verifyToken,
  RefreshToken: refreshToken,
  EsiObservers:esiObservers,
  EsiObserve:esiObserve,
  EsiPublicInfo:esiPublicInfo,
  EsiStructureInfo:esiStructureInfo,
  EsiExtractions:esiExtractions
}

/**
 * Authroizes a token through ESI. 
 * @param {string} token The code.
 * @returns A RequestPromise.
 */
function authToken(token){
  var options = {
    method: 'POST',
    url: "https://login.eveonline.com/oauth/token",
    headers: {
      "authorization": "Basic " + Buffer.from(process.env.client_id+":"+process.env.client_secret).toString('base64'),
      "content-type": "application/json"
    },
    json: {
      "grant_type":"authorization_code",
      "code":token
    }
  };

  return RequestPromise(options);
}

/**
 * Refreshes a token through ESI.
 * @param {string} token The refresh_token.
 * @returns a RequestPromise.
 */
function refreshToken(token) {
  var options = {
    method: 'POST',
    url: "https://login.eveonline.com/oauth/token",
    headers: {
      "Authorization": "Basic " + Buffer.from(process.env.client_id+":"+process.env.client_secret).toString('base64'),
      "content-type": "application/json"
    },
    json: {
      "grant_type":"refresh_token",
      "refresh_token": token
    }
  };

  return RequestPromise(options);  
}


/**
 * Verifies a token through ESI.
 * @param {string} token Verification token
 * @returns a RequestPromise.
 */
function verifyToken(token) {
  var options = {
    method: 'GET',
    url: "https://login.eveonline.com/oauth/verify",
    headers: {
      "authorization" : "Bearer " + token
    }
  };

  return RequestPromise(options);
}

function esiObservers(token,corporation_id) {
  var options = {
    method: 'GET',
    url: `https://esi.tech.ccp.is/latest/corporation/${corporation_id}/mining/observers/?datasource=tranquility&page=1&token=${token}`,
    headers: {}
  }

  return RequestPromise(options);
}

function esiObserve(token, corporation_id, observer_id) {
  var options = {
    method: 'GET',
    url: `https://esi.tech.ccp.is/latest/corporation/${corporation_id}/mining/observers/${observer_id}/?datasource=tranquility&page=1&token=${token}`,
    headers: {}
  }

  return RequestPromise(options);
}

function esiPublicInfo(token, character_id) {
  var options = {
    method: 'GET',
    url: `https://esi.tech.ccp.is/latest/characters/${character_id}/?datasource=tranquility&page=1&token=${token}`,
    headers: {}
  }

  return RequestPromise(options);
}

function esiStructureInfo(token, structure_id) {
  var options = {
    method: 'GET',
    url: `https://esi.tech.ccp.is/latest/universe/structures/${structure_id}/?datasource=tranquility&page=1&token=${token}`,
    headers: {}
  }

  return RequestPromise(options);
}

function esiExtractions(token, corporation_id) {
  var options = {
    method: 'GET',
    url: `https://esi.tech.ccp.is/latest/corporation/${corporation_id}/mining/extractions/?datasource=tranquility&page=1&token=${token}`,
    headers: {}
  }

  return RequestPromise(options);
}