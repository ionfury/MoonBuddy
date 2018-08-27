let Chai = require('chai');
let Expect = Chai.expect;
let Moment = require('moment');

let TestData = require('../testdata.json');
let Irs = require('../../src/services/irs.js');
let Formatters = require('../../src/formatters.js');

it('Irs.Tax(`ion fury`, 1091440439, 1526688000.0, 1626688000.0 should return array', async () => {
  process.env.test_grpc_url = TestData.test_grpc_url;
  process.env.test_grpc_token = TestData.test_grpc_token;
  let date = new Date(), y = date.getFullYear(), m = date.getMonth();
  let begin = new Date(y, m, 1);
  let end = new Date(y, m + 1, 0);
  let res = await Irs.Tax('Spark Progenitori', 1091440439, begin, end);
  
  Expect(res).to.be.a('object');
});