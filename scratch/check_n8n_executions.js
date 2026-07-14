// scratch/check_n8n_executions.js
const token = 'JWT_REPLACED_FOR_SECURITY';
const executionId = '135';

async function main() {
  console.log(`Fetching execution ${executionId} from n8n API with includeData=true...`);
  try {
    const url = `https://n8n.sistemaindumentaria.com/api/v1/executions/${executionId}?includeData=true`;
    const res = await fetch(url, {
      headers: {
        'X-N8N-API-KEY': token
      }
    });

    console.log("Response Status:", res.status);
    const text = await res.text();
    
    if (res.ok) {
      const data = JSON.parse(text);
      console.log("Execution fetched successfully!");
      
      const fs = require('fs');
      fs.writeFileSync('scratch/last_execution_detail.json', JSON.stringify(data, null, 2));
      console.log("Saved details to scratch/last_execution_detail.json");
    } else {
      console.error("Failed to fetch execution:", text);
    }
  } catch (error) {
    console.error("Request failed:", error);
  }
}

main();
