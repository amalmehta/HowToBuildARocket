// WebGL check, kept apart from viewer.js so the page can run even when
// Three.js (from the CDN) fails to load.
export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return false;
    // Release the probe context so it doesn't count against the browser's limit.
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch { return false; }
}
