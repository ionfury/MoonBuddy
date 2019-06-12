let Chai = require('chai');
let Expect = Chai.expect;

let TestData = require('../testdata.json');
let Grpc = require('../../src/repositories/test-grpc.js');

it('Grpc.GetCorpLedger should return an array', async() => {
  process.env.test_grpc_url = TestData.test_grpc_url;
  process.env.test_grpc_token = TestData.test_grpc_token;
  let date = new Date(), y = date.getFullYear(), m = date.getMonth();
  let begin = new Date(y, m, 1);
  let end = new Date(y, m + 1, 0);
  let res = await Grpc.GetCorpLedger(1091440439, begin, end);
  Expect(res).to.be.a('string');
});