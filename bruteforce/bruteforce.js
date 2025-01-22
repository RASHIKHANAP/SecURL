// Function to display error messages
function showError(message) {
  const alert = document.querySelector(".alert");
  alert.innerText = message;
  alert.style.opacity = 1;
}

// Function to handle the brute force decryption process
async function onBruteForce() {
  // Check for required browser APIs
  if (!("importKey" in window.crypto.subtle)) {
    showError("window.crypto not loaded. Please reload over HTTPS.");
    return;
  }
  if (!("b64" in window && "apiVersions" in window)) {
    showError("Important libraries not loaded!");
    return;
  }

  // Validate the entered URL
  const urlText = document.querySelector("#encrypted-url").value;
  let url;
  try {
    url = new URL(urlText);
  } catch {
    showError('Invalid URL. Ensure it starts with "https://".');
    return;
  }

  // Parse URL hash for parameters
  let params;
  try {
    params = JSON.parse(b64.decode(url.hash.slice(1)));
  } catch {
    showError("The link appears corrupted.");
    return;
  }

  // Validate necessary parameters
  if (!("v" in params && "e" in params)) {
    showError("The link appears corrupted. Missing required parameters.");
    return;
  }
  if (!(params["v"] in apiVersions)) {
    showError("Unsupported API version. The link may be corrupted.");
    return;
  }

  // Extract required data for decryption
  const api = apiVersions[params["v"]];
  const encrypted = b64.base64ToBinary(params["e"]);
  const salt = params["s"] ? b64.base64ToBinary(params["s"]) : null;
  const iv = params["i"] ? b64.base64ToBinary(params["i"]) : null;

  // Validate and prepare character set
  const charset = document.querySelector("#charset").value.split("");
  if (charset.length === 0) {
    showError("Charset cannot be empty.");
    return;
  }

  // Progress tracking object
  const progress = {
    tried: 0,
    total: 0,
    len: 0,
    overallTotal: 0,
    done: false,
    startTime: performance.now(),
  };

  // Recursive function to try all combinations for the current length
  async function tryCombinations(prefix, targetLength, currentLength) {
    if (progress.done) return;

    if (currentLength === targetLength) {
      progress.tried++;
      try {
        await api.decrypt(encrypted, prefix, salt, iv);
        document.querySelector("#output").value = prefix;
        progress.done = true;
        showError("Decryption completed!");
      } catch {
        // Ignore incorrect decryption attempts
      }
      return;
    }

    for (const char of charset) {
      await tryCombinations(prefix + char, targetLength, currentLength + 1);
    }
  }

  // Function to update progress periodically
  function updateProgress() {
    if (progress.done) {
      clearInterval(progressUpdater);
      return;
    }
    const elapsed = performance.now() - progress.startTime;
    const percentage = ((progress.tried / progress.total) * 100).toFixed(3);
    const speed = (((progress.overallTotal + progress.tried) / elapsed) * 1000).toFixed(3);

    showError(
      `Trying ${progress.total} passwords of length ${progress.len} – ${percentage}% complete. ` +
      `Testing ${speed} passwords per second.`
    );
  }

  // Main brute force loop
  (async () => {
    for (let length = 0; !progress.done; length++) {
      progress.overallTotal += progress.tried;
      progress.tried = 0;
      progress.total = Math.pow(charset.length, length);
      progress.len = length;
      updateProgress();
      await tryCombinations("", length, 0);
    }
  })();

  // Set interval to periodically update progress
  const progressUpdater = setInterval(updateProgress, 4000);
}
