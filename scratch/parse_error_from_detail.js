// scratch/parse_error_from_detail.js
const fs = require('fs');

function main() {
  const detail = JSON.parse(fs.readFileSync('scratch/last_execution_detail.json', 'utf8'));
  const runData = detail.data.resultData.runData;
  
  console.log("=== Node-by-Node Execution Status ===");
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
}

main();
