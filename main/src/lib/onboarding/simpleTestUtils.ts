// src/lib/onboarding/simpleTestUtils.ts
// Simple testing utilities without circular dependencies

/**
 * Simple testing functions for manual error testing
 */

// Manually trigger session expired modal
function expireSession() {
  console.log('🧪 TEST: Triggering session expired modal...');
  
  // Directly trigger the error modal
  const event = new CustomEvent('onboarding-test-session-expired');
  window.dispatchEvent(event);
  
  console.log('✅ Session expired modal should appear.');
}

// Manually trigger network error modal
function triggerNetworkError() {
  console.log('🧪 TEST: Triggering network error modal...');
  
  const event = new CustomEvent('onboarding-test-network-error');
  window.dispatchEvent(event);
  
  console.log('✅ Network error modal should appear.');
}

// Manually trigger not found modal
function triggerNotFound() {
  console.log('🧪 TEST: Triggering not found modal...');
  
  const event = new CustomEvent('onboarding-test-not-found');
  window.dispatchEvent(event);
  
  console.log('✅ Not found modal should appear.');
}

// Manually trigger generic error modal
function triggerGenericError() {
  console.log('🧪 TEST: Triggering generic error modal...');
  
  const event = new CustomEvent('onboarding-test-generic-error');
  window.dispatchEvent(event);
  
  console.log('✅ Generic error modal should appear.');
}

// Make functions available globally for browser console
if (typeof window !== 'undefined') {
  (window as any).testSessionExpiry = expireSession;
  (window as any).testNetworkError = triggerNetworkError;
  (window as any).testNotFound = triggerNotFound;
  (window as any).testGenericError = triggerGenericError;
  
  console.log('🧪 Testing functions available:');
  console.log('- window.testSessionExpiry()');
  console.log('- window.testNetworkError()');
  console.log('- window.testNotFound()');
  console.log('- window.testGenericError()');
}
