import { getAuthHeaders } from './api';

async function request(url, options = {}) {
  const headers = getAuthHeaders(options.headers || {});
  if (options.body instanceof FormData) delete headers['Content-Type'];
  const r = await fetch(url, { credentials: 'include', ...options, headers });
  if (!r.ok) {
    const info = await r.json().catch(() => ({}));
    throw new Error(info.error || info.message || `Request failed with status ${r.status}`);
  }
  const result = await r.json();
  if (!result.success) throw new Error(result.error || result.message || 'Unknown server error');
  return result.data;
}
const uri = id => encodeURIComponent(id);
export const researchModelStatus = () => request('/api/research/model');
export const researchPatientStatus = id => request(`/api/research/${uri(id)}/status`);
export const researchManifest = id => request(`/api/research/${uri(id)}/manifest`);
export const researchStart = id => request(`/api/research/${uri(id)}/run`, { method: 'POST', body: JSON.stringify({}) });
export const researchUpload = (id, file) => {
  const form = new FormData();
  form.append('image', file);
  return request(`/api/research/${uri(id)}/upload`, { method: 'POST', body: form });
};
export async function researchMeshBlob(url) {
  if (!/^\/api\/research\/[\w-]+\/meshes\/[\w-]+\.stl$/.test(url)) {
    throw new Error('Invalid mesh URL');
  }
  const response = await fetch(url, { credentials: 'include', headers: getAuthHeaders() });
  if (!response.ok) throw new Error(`Mesh request failed: ${response.status}`);
  return response.arrayBuffer();
}
