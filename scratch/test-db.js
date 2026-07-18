require('dotenv').config();
const { testConnection } = require('../db/pool');

testConnection().then(success => {
  console.log('Connection success:', success);
  process.exit(success ? 0 : 1);
});
