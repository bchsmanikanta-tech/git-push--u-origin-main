const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config();
const { initDatabase } = require('../db/pool');
const { Jobseeker, Application } = require('../db/models');

async function run() {
  await initDatabase();
  
  console.log('--- JOBSEEKERS ---');
  const seekers = await Jobseeker.find();
  for (const s of seekers) {
    console.log(`Email: ${s.email}`);
    console.log(`Resume starts with: ${s.resume ? s.resume.substring(0, 50) + '...' : 'NONE'}`);
    console.log('---');
  }

  console.log('--- APPLICATIONS ---');
  const apps = await Application.find();
  for (const a of apps) {
    console.log(`App ID: ${a._id}`);
    console.log(`Job: ${a.job_title}`);
    console.log(`Seeker: ${a.seeker_email}`);
    console.log(`Resume starts with: ${a.resume ? a.resume.substring(0, 50) + '...' : 'NONE'}`);
    console.log('---');
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
