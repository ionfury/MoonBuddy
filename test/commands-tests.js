let Chai = require('chai');
let Expect = Chai.expect;

let Commands = require('../src/commands.js');
let TestData = require('./testdata.json');

it('Command.Help should return a string', async () => {
  let res = await Commands.Help();
  Expect(res).to.be.a('string');
});

it('Command.Owned should return a string', async () => {
  process.env.refresh_token = TestData.RefreshToken;
  process.env.client_id = TestData.client_id;
  process.env.client_secret = TestData.client_secret;
  let res = await Commands.Owned('');
  Expect(res).to.be.a('string');
});

it('Command.Schedule should return a string', async () => {
  process.env.refresh_token = TestData.RefreshToken;
  process.env.client_id = TestData.client_id;
  process.env.client_secret = TestData.client_secret;
  let res = await Commands.Schedule('');
  Expect(res).to.be.a('string');
});

it('Command.Values should return a string', async () => {
  process.env.refresh_token = TestData.RefreshToken;
  process.env.client_id = TestData.client_id;
  process.env.client_secret = TestData.client_secret;
  let res = await Commands.Values('');
  Expect(res).to.be.a('string');
});
