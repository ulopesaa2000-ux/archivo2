// scratch/test_ocr_webhook.js
const fs = require('fs');
const path = require('path');

const WEBHOOK_URL = 'https://n8n.sistemaindumentaria.com/webhook/nota-movimiento';

async function main() {
  console.log("Downloading Google logo for OCR test...");
  const imageUrl = 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png';
  
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      throw new Error(`Failed to download image: ${imgRes.statusText}`);
    }
    const buffer = await imgRes.arrayBuffer();
    const fileBlob = new Blob([buffer], { type: 'image/png' });

    console.log("Sending image to n8n webhook...");
    const formData = new FormData();
    formData.append('foto', fileBlob, 'googlelogo.png');
    formData.append('tipo', 'entrada');
    formData.append('client_request_id', `test-${Date.now()}`);

    const startTime = Date.now();
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      body: formData
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Response Status: ${res.status} (took ${duration}s)`);
    
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      console.log("Success! Response JSON:");
      console.log(JSON.stringify(data, null, 2));
    } catch {
      console.log("Raw response (not JSON):", text);
    }
  } catch (error) {
    console.error("Test failed:", error);
  }
}

main();
