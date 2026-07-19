const http = require('https');

function checkUrl(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ url, status: res.statusCode, body: data });
      });
    }).on('error', (err) => {
      resolve({ url, error: err.message });
    });
  });
}

async function run() {
  const r1 = await checkUrl('https://smartjobvacancyfindersystem.netlify.app/api/status');
  const r2 = await checkUrl('https://jobvacancysystem.netlify.app/api/status');
  console.log('SITE 1:', r1);
  console.log('SITE 2:', r2);
  process.exit(0);
}

run();
