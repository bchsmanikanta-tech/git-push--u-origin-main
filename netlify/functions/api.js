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
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      const { Admin } = require('../../db/models');
      const exists = await Admin.findOne({ email: 'admin@smartjob.com' });
      if (!exists) {
        await Admin.create({ name: 'Super Admin', email: 'admin@smartjob.com', password: 'Admin@123', role: 'Super Admin', status: 'Active' });
        console.log('[ADMIN] Default admin created → admin@smartjob.com / Admin@123');
      } else if (exists.password !== 'Admin@123') {
        exists.password = 'Admin@123';
        await exists.save();
        console.log('[ADMIN] Default admin password reset → Admin@123');
      }
    } else {
      console.log('[NETLIFY SEED] Skipping database query checks because MongoDB connection is not established.');
    }
    dbInitialized = true;
  }
  return serverlessHandler(event, context);
};

exports.handler = handler;
