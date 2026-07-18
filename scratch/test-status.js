const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config();
const { initDatabase } = require('../db/pool');
const { getSharedUsers, setSharedUserStatus } = require('../admin-module/server/utils/sharedData');

async function run() {
  await initDatabase();
  
  const users = await getSharedUsers();
  console.log('Total users found:', users.length);
  if (users.length > 0) {
    const user = users[0];
    console.log('Testing setSharedUserStatus for user:', user._id, 'current status:', user.status);
    try {
      const updated = await setSharedUserStatus(user._id, 'Blocked');
      console.log('Updated user status to Blocked:', updated);
      const updated2 = await setSharedUserStatus(user._id, 'Active');
      console.log('Reset user status to Active:', updated2);
    } catch (err) {
      console.error('Error during status change:', err);
    }
  } else {
    console.log('No users to test status change on.');
  }
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
