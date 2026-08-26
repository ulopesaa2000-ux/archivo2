// scripts\supabase\tests\test_raw_sql.js
const https = require('https');
const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const apiKey = envConfig.N8N_API_KEY;

// Let's test by updating a query in n8n or testing with test script
console.log('Testing SQL...');
