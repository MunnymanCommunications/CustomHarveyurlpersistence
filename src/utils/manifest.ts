export interface ManifestData {
    name: string;
    shortName: string;
    startUrl: string;
    iconUrl: string;
    iconType: string;
}

export function generateManifest(data: ManifestData) {
    return {
        name: data.name,
        short_name: data.shortName,
        start_url: data.startUrl,
        scope: new URL(data.startUrl).origin + '/',
        display: 'standalone',
        background_color: '#111827',
        theme_color: '#111827',
        icons: [
            { src: data.iconUrl, sizes: '192x192', type: data.iconType, purpose: 'any maskable' },
            { src: data.iconUrl, sizes: '512x512', type: data.iconType, purpose: 'any maskable' }
        ]
    };
}

export function updateManifest(manifestData: ManifestData) {
    const manifest = generateManifest(manifestData);
    const manifestJson = JSON.stringify(manifest, null, 0);

    // Create a script element to inject the manifest data
    const script = document.createElement('script');
    script.id = 'dynamic-manifest-data';
    script.type = 'application/json';
    script.textContent = manifestJson;

    // Remove any existing manifest script
    const existingScript = document.getElementById('dynamic-manifest-data');
    if (existingScript) {
        existingScript.remove();
    }

    // Add the new script element
    document.head.appendChild(script);

    // Update the manifest link to point to our dynamic handler
    const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    if (!manifestLink) {
        const newLink = document.createElement('link');
        newLink.rel = 'manifest';
        newLink.href = '/dynamic-manifest.json';
        document.head.appendChild(newLink);
    } else if (manifestLink.href !== '/dynamic-manifest.json') {
        manifestLink.href = '/dynamic-manifest.json';
    }
}