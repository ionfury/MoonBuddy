let Chai = require('chai');
let Expect = Chai.expect;

let Messages = require('../src/messages.js');

it('Messages.CodeBlock should equal', () => {
  let msg = Messages.CodeBlock('test');
  Expect(msg).to.equal(`\`\`\`test\`\`\``);
});