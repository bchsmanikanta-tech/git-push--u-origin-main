const serverless = require('serverless-http');
const app = require('../../server');
const connectDB = require('../../db/connection');
const mongoose = require('mongoose');

let seedChecked = false;
const serverlessHandler = serverless(app);

// Wrapper to ensure DB is initialized before handling any requests
const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }

  if (!seedChecked && mongoose.connection.readyState === 1) {
    try {
      const { Admin } = require('../../db/models');
      const exists = await Admin.findOne({ email: 'admin@smartjob.com' });
      if (!exists) {
        await Admin.create({ name: 'Super Admin', email: 'admin@smartjob.com', password: 'Admin@123', role: 'Super Admin', status: 'Active' });
        console.log('[ADMIN] Default admin created → admin@smartjob.com / Admin@123');
      }
      seedChecked = true;
    } catch (err) {
      console.warn('[NETLIFY SEED WARNING]', err.message);
    }
  }

  return serverlessHandler(event, context);
};

exports.handler = handler;
