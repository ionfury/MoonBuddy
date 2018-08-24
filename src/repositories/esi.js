let RequestPromise = require('request-promise');

let Config = require('../../data/config.json');

module.exports = {
/**
 * Authroizes a token through ESI. 
 * @param {string} token The code.
 * @returns A RequestPromise.
 */
  AuthToken: (token) => {
    let options = {
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
  },

/**
 * Refreshes a token through ESI.
 * @param {string} token The the refresh token.
 * @returns a RequestPromise.
 */
  RefreshToken: (token) => {
    let options = {
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
  
    return RequestPromise(options).then(res => res.access_token);
  },

/**
 * Verifies a token through ESI.
 * @param {string} token Verification token
 * @returns a RequestPromise.
 */
  VerifyToken: (token) => {
    let options = {
      method: 'GET',
      url: "https://login.eveonline.com/oauth/verify",
      headers: {
        "authorization" : "Bearer " + token
      }
    };

    return RequestPromise(options);
  },

/**
 * Creates a promise to ESI.
 * @param {*options} options Yeah figure it out asshole. 
 * @returns a Request Promise
 */
  Get: (options) => {
    let route = options.route || ``;
    let parameters = options.parameters || ``;
    let token = options.token || ``;
    let page = options.page || 1;
    let datasource = options.datasource || `tranquility`;
    let server = options.server || Config.server;
    let url = options.url || Config.url;

    let req = {
      method: 'GET',
      url: `${url}/${server}/${route}?datasource=${datasource}&page=${page}&token=${token}&${parameters}`
    }
    
    return RequestPromise(req).then(JSON.parse);
  }
}


