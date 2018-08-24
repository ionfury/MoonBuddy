let Chai = require('chai');
let Expect = Chai.expect;

let Types = require('../../src/repositories/types.js');

it('Types.InfoList should return a type for each passed typeId', async () => {
  let res = await Types.InfoList([34,35,36]);
  Expect(res).to.have.lengthOf(3);
});

it('Types.Info should return the type for Tritanium', async () => {
  let res = await Types.Info(34);
  Expect(res.name).to.equal('Tritanium');
});

it('Types.Id searching strictly should find 34', async () => {
  let res = await Types.Id('Tritanium');
  Expect(res).to.equal(34);
});
