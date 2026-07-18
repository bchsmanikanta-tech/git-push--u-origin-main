const serverless = require('serverless-http');
const app = require('../../server'); // The exported express app
const connectDB = require('../../db/connection');

let dbInitialized = false;

// Wrapper to ensure DB is initialized before handling any requests
const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  if (!dbInitialized) {
    await connectDB();
    dbInitialized = true;
  }
  const serverlessHandler = serverless(app, { basePath: '/.netlify/functions' });
  return serverlessHandler(event, context);
};

exports.handler = handler;
