let Chai = require('chai');
let Expect = Chai.expect;

let Characters = require('../../src/repositories/characters.js');

it('Characters.Id should return a character', async () => {
  let res = await Characters.Id('ion fury');
  Expect(res).to.equal(238644413);
})