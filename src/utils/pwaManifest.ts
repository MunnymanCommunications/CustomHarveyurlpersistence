/**
 * PWA Manifest Dynamic Generation
 * This utility generates a custom manifest.json based on the current URL and assistant
 */

import type { Assistant } from '../types';
import { DEFAULT_AVATAR_URL } from '../constants';

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose: string;
}

interface PWAManifest {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  display: string;
  background_color: string;
  theme_color: string;
  icons: ManifestIcon[];
}

/**
 * Generates a PWA manifest for a public assistant
 */
export function generatePublicAssistantManifest(
  assistant: Pick<Assistant, 'name' | 'avatar' | 'description' | 'author_name'>,
  assistantId: string
): PWAManifest {
  const avatarUrl = assistant.avatar || DEFAULT_AVATAR_URL;
  const startUrl = `/#/public/${assistantId}`;

  return {
    name: `${assistant.name} - AI Assistant`,
    short_name: assistant.name,
    description: assistant.description || `${assistant.name} by ${assistant.author_name || 'Harvey IO'}`,
    start_url: startUrl,
    display: 'standalone',
    background_color: '#111827',
    theme_color: '#111827',
    icons: [
      {
        src: avatarUrl,
        sizes: '192x192',
        type: getMimeType(avatarUrl),
        purpose: 'any maskable',
      },
      {
        src: avatarUrl,
        sizes: '512x512',
        type: getMimeType(avatarUrl),
        purpose: 'any maskable',
      },
    ],
  };
}

/**
 * Generates the default app manifest
 */
export function generateDefaultManifest(): PWAManifest {
  return {
    name: 'Harvey IO - by Nicholas Munn',
    short_name: 'Harvey IO',
    description: 'A fully customizable AI voice assistant with a visual avatar, personality traits, knowledge base, and a memory system.',
    start_url: '/',
    display: 'standalone',
    background_color: '#111827',
    theme_color: '#111827',
    icons: [
      {
        src: '/favicon.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
      {
        src: '/favicon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
    ],
  };
}

/**
 * Updates the manifest link in the document head
 */
export function updateManifestLink(manifest: PWAManifest): void {
  // Remove existing manifest link
  const existingLink = document.querySelector('link[rel="manifest"]');
  if (existingLink) {
    existingLink.remove();
  }

  // Create new manifest link with data URL
  const manifestJson = JSON.stringify(manifest);
  const manifestBlob = new Blob([manifestJson], { type: 'application/json' });
  const manifestUrl = URL.createObjectURL(manifestBlob);

  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = manifestUrl;
  document.head.appendChild(link);

  // Also update apple-touch-icon for iOS
  updateAppleTouchIcon(manifest.icons[0].src);

  // Update theme-color meta tag
  updateThemeColor(manifest.theme_color);
}

/**
 * Updates the apple-touch-icon for iOS devices
 */
function updateAppleTouchIcon(iconUrl: string): void {
  let appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;

  if (!appleTouchIcon) {
    appleTouchIcon = document.createElement('link');
    appleTouchIcon.rel = 'apple-touch-icon';
    document.head.appendChild(appleTouchIcon);
  }

  appleTouchIcon.href = iconUrl;
}

/**
 * Updates the theme-color meta tag
 */
function updateThemeColor(color: string): void {
  let themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;

  if (!themeColorMeta) {
    themeColorMeta = document.createElement('meta');
    themeColorMeta.name = 'theme-color';
    document.head.appendChild(themeColorMeta);
  }

  themeColorMeta.content = color;
}

/**
 * Gets MIME type from URL
 */
function getMimeType(url: string): string {
  if (url.endsWith('.png')) return 'image/png';
  if (url.endsWith('.jpg') || url.endsWith('.jpeg')) return 'image/jpeg';
  if (url.endsWith('.gif')) return 'image/gif';
  if (url.endsWith('.svg')) return 'image/svg+xml';
  if (url.endsWith('.webp')) return 'image/webp';
  return 'image/png'; // Default
}
