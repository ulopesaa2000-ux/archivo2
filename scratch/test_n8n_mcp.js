// scratch/test_n8n_mcp.js
const token = 'JWT_REPLACED_FOR_SECURITY';

function parseSSE(text) {
  const lines = text.split('\n');
  let currentEvent = null;
  const results = [];
  for (const line of lines) {
    if (line.startsWith('event:')) {
      currentEvent = line.replace('event:', '').trim();
    } else if (line.startsWith('data:')) {
      const dataStr = line.replace('data:', '').trim();
      try {
        const payload = JSON.parse(dataStr);
        results.push({ event: currentEvent, data: payload });
      } catch (e) {
        console.error("Failed to parse data line:", dataStr, e);
      }
    }
  }
  return results;
}

async function callMcpMethod(method, params = {}) {
  const requestBody = {
    jsonrpc: "2.0",
    id: Math.floor(Math.random() * 1000),
    method,
    params
  };

  const res = await fetch("https://n8n.sistemaindumentaria.com/mcp-server/http", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json, text/event-stream"
    },
    body: JSON.stringify(requestBody)
  });

  const text = await res.text();
  return parseSSE(text);
}

async function main() {
  console.log("=== Executing Workflow DtZOqR4-9_DnULEjWW78b ===");
  const execRes = await callMcpMethod("tools/call", {
    name: "execute_workflow",
    arguments: {
      workflowId: "DtZOqR4-9_DnULEjWW78b",
      inputs: {
        type: "webhook",
        webhookData: {
          method: "POST",
          body: {
            client_request_id: "test-mcp-execution-1"
          }
        }
      }
    }
  });

  const callResult = execRes.find(r => r.data?.result?.content || r.data?.result)?.data?.result || execRes;
  console.log(JSON.stringify(callResult, null, 2));
}

main().catch(console.error);
