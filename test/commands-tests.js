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
  let res = await Commands.Owned('');
  Expect(res).to.equal('string');
});