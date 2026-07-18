const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config();

const { setSharedUserStatus } = require('../admin-module/server/utils/sharedData');
const { initDatabase } = require('../db/pool');

async function run() {
  await initDatabase();
  
  const testId = 'jobseeker_b.chs.manikanta@gmail.com';
  console.log(`Testing setSharedUserStatus for prefixed ID: ${testId} to Blocked...`);
  const updated = await setSharedUserStatus(testId, 'Blocked');
  console.log('Result:', updated ? { email: updated.email, status: updated.status } : 'NULL (Failed)');
  
  // Reset back to active
  const reset = await setSharedUserStatus(testId, 'Active');
  console.log('Reset Result:', reset ? { email: reset.email, status: reset.status } : 'NULL (Failed)');
  
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
