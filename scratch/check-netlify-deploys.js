const { exec } = require('child_process');

const siteId = '4156ce13-1b16-440c-b018-b062c9a1bf4e';
const cmd = `npx netlify api listSiteDeploys --data "{\\"site_id\\": \\"${siteId}\\"}"`;

exec(cmd, (err, stdout, stderr) => {
  if (err) {
    console.error('ERROR:', err.message);
    console.error('STDERR:', stderr);
    process.exit(1);
  }
  try {
    const deploys = JSON.parse(stdout);
    console.log('Total deploys found:', deploys.length);
    if (deploys.length > 0) {
      console.log('Latest deploy status:');
      console.log('  ID:        ', deploys[0].id);
      console.log('  State:     ', deploys[0].state);
      console.log('  Context:   ', deploys[0].context);
      console.log('  Created:   ', deploys[0].created_at);
      console.log('  Commit Ref:', deploys[0].commit_ref);
      console.log('  URL:       ', deploys[0].deploy_ssl_url);
    }
  } catch (e) {
    console.log('Failed to parse JSON. Raw output:');
    console.log(stdout);
  }
  process.exit(0);
});
