let used = false;
async function run() {
  if (used) throw Error('Owned gate is single-use'); used = true;
  const worker = new Worker('/worker.js', { type: 'module', name: 'sparse-upload-real-gpu-gate' });
  try {
    return await new Promise<unknown>((resolve, reject) => {
      worker.onerror = event => reject(Error(`Owned QA worker error: ${event.message}`));
      worker.onmessage = event => {
        if (event.data.kind === 'stage') console.log(JSON.stringify(event.data));
        else if (event.data.kind === 'result') resolve(event.data);
        else reject(Error('Unknown owned QA worker message'));
      };
      worker.postMessage({ run: true });
    });
  } finally { worker.terminate(); }
}
Object.assign(window, { sparseQaReady: true, sparseQaRun: run });
