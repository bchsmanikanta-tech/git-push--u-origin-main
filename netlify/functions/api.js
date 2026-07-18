const serverless = require('serverless-http');
const app = require('../../server');
const connectDB = require('../../db/connection');

let dbInitialized = false;
const serverlessHandler = serverless(app);

// Wrapper to ensure DB is initialized before handling any requests
const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  if (!dbInitialized) {
    await connectDB();
    dbInitialized = true;
  }
  return serverlessHandler(event, context);
};

exports.handler = handler;
