// scratch/fetch_last_error.js
const fs = require('fs');
const token = 'JWT_REPLACED_FOR_SECURITY';
const workflowId = 'DtZOqR4-9_DnULEjWW78b';

async function main() {
  console.log("Fetching latest execution ID...");
  try {
    const listRes = await fetch(`https://n8n.sistemaindumentaria.com/api/v1/executions?workflowId=${workflowId}&limit=1`, {
      headers: { 'X-N8N-API-KEY': token }
    });
    if (!listRes.ok) throw new Error(`List failed: ${await listRes.text()}`);
    
    const listData = await listRes.json();
    if (!listData.data || listData.data.length === 0) {
      console.log("No executions found.");
      return;
    }
    
    const latestExecId = listData.data[0].id;
    const latestExecStatus = listData.data[0].status;
    console.log(`Latest Execution ID: ${latestExecId} (Status: ${latestExecStatus})`);
    
    console.log(`Fetching execution details for ${latestExecId}...`);
    const detailRes = await fetch(`https://n8n.sistemaindumentaria.com/api/v1/executions/${latestExecId}?includeData=true`, {
      headers: { 'X-N8N-API-KEY': token }
    });
    if (!detailRes.ok) throw new Error(`Detail fetch failed: ${await detailRes.text()}`);
    
    const detailData = await detailRes.json();
    fs.writeFileSync('scratch/last_execution_detail.json', JSON.stringify(detailData, null, 2));
    
    const runData = detailData.data.resultData.runData;
    console.log("\n=== Node-by-Node Execution Status ===");
    for (const [nodeName, runs] of Object.entries(runData)) {
      runs.forEach((run, idx) => {
        console.log(`Node: "${nodeName}" (Run #${idx + 1}) - Status: ${run.executionStatus}`);
        if (run.executionStatus === 'error' && run.error) {
          console.error(`  Error Message: ${run.error.message}`);
          if (run.error.description) console.error(`  Description: ${run.error.description}`);
          if (run.error.stack) console.error(`  Stack: ${run.error.stack.slice(0, 300)}`);
        }
      });
    }
  } catch (error) {
    console.error("Failed:", error);
  }
}

main();
