// Minimal service worker for PWA installability
// Enables Add to Home Screen (A2HS) functionality
// No caching - network handles all requests

self.addEventListener('install', (event) => {
  // skipWaiting() activates the new service worker immediately
  // without waiting for old service workers to close all client tabs
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // clients.claim() gives the service worker control over all open clients
  // without requiring a page refresh
  event.waitUntil(clients.claim());
});
