let Grpc = require('grpc');
let GrpcPromise = require('grpc-promise');
let Promise = require('bluebird');
let Timestamp = require('unix-timestamp');

let TestGrpc = Grpc.load('./data/grpc/test-grpc.proto').grpc_ledger;

/*


*/
module.exports = {
  GetCorpLedger: (id, begin, end) => {
    var Client = new TestGrpc.LedgerService(process.env.test_grpc_url, Grpc.credentials.createInsecure());
    GrpcPromise.promisifyAll(Client);

    let ledgerRequest = {
      token: process.env.test_grpc_token,
      corp_id: id,
      beginning_timestamp: Timestamp.fromDate(begin),//1526688000.0,
      ending_timestamp: Timestamp.fromDate(end)//1626688000.0
    }

    return Client
      .GetCorpLedger()
      .sendMessage(ledgerRequest);
  }
}