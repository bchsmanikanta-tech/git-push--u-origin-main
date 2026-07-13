const serverless = require('serverless-http');
const app = require('../../server'); // The exported express app
const { initDatabase } = require('../../db/pool');

let dbInitialized = false;

// Wrapper to ensure DB is initialized before handling any requests
const handler = async (event, context) => {
  if (!dbInitialized) {
    await initDatabase();
    dbInitialized = true;
  }
  const serverlessHandler = serverless(app, { basePath: '/.netlify/functions' });
  return serverlessHandler(event, context);
};

exports.handler = handler;
