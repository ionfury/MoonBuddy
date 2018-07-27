let RequestPromise = require('request-promise');
let Promise = require('bluebird');
let Config = require(`./../config.json`);
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

/**
 * Creates a promise to ESI.
 * @param {*options} options Yeah figure it out asshole. 
 * @returns a Request Promise
 */
const esiGet = (options) => {
  var route = options.route || ``;
  var parameters = options.parameters || ``;
  var token = options.token || ``;
  var page = options.page || 1;
  var datasource = options.datasource || `tranquility`;
  var server = options.server || Config.server;
  var url = options.url || Config.url;

  var options = {
    method: 'GET',
    url: `${url}/${server}/${route}?datasource=${datasource}&page=${page}&token=${token}&${parameters}`
  }
  
  return RequestPromise(options);
}

module.exports = {
  AuthToken: authToken,
  VerifyToken: verifyToken,
  RefreshToken: refreshToken,
  EsiGet: esiGet
}