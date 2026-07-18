const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config();

const db = require('../db/queries');
const { initDatabase } = require('../db/pool');

async function run() {
  await initDatabase();
  
  // Let's try to set status of a jobseeker using the query method
  console.log('Testing setJobseekerStatus for b.chs.manikanta@gmail.com to suspended...');
  const updated = await db.setJobseekerStatus('b.chs.manikanta@gmail.com', 'suspended');
  console.log('Result:', updated);
  
  // Reset it back to active
  const reset = await db.setJobseekerStatus('b.chs.manikanta@gmail.com', 'active');
  console.log('Reset Result:', reset);
  
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
