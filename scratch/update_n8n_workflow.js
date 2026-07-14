// scratch/update_n8n_workflow.js
const token = 'JWT_REPLACED_FOR_SECURITY';
const workflowId = 'DtZOqR4-9_DnULEjWW78b';

async function main() {
  console.log("Fetching workflow from n8n API with X-N8N-API-KEY header...");
  try {
    const res = await fetch(`https://n8n.sistemaindumentaria.com/api/v1/workflows/${workflowId}`, {
      headers: {
        'X-N8N-API-KEY': token
      }
    });

    console.log("Response Status:", res.status);
    const text = await res.text();
    
    if (res.ok) {
      const data = JSON.parse(text);
      console.log("Workflow fetched successfully!");
      console.log("Name:", data.name);
      console.log("Number of nodes:", data.nodes ? data.nodes.length : 0);
      
      const fs = require('fs');
      fs.writeFileSync('scratch/workflow_current.json', JSON.stringify(data, null, 2));
      console.log("Saved current workflow to scratch/workflow_current.json");
    } else {
      console.error("Failed to fetch workflow:", text);
    }
  } catch (error) {
    console.error("Request failed:", error);
  }
}

main();
