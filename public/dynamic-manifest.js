// This script needs to be inlined in the HTML to handle dynamic manifest requests
const manifestScript = document.getElementById('dynamic-manifest-data');
if (manifestScript && manifestScript.textContent) {
    const manifestData = manifestScript.textContent;
    const manifestHeaders = {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'no-cache'
    };
    const blob = new Blob([manifestData], { type: 'application/manifest+json' });
    const response = new Response(blob, { headers: manifestHeaders });
    return response;
}