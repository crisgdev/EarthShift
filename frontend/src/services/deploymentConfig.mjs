export function publicOrigin(value, name) {
  const url=new URL(value);
  if(url.username || url.password || url.pathname!=='/' || url.search || url.hash)throw new Error(`${name} must be an origin without credentials or a path`);
  const host=url.hostname.toLowerCase();
  if(url.protocol!=='https:' || host==='localhost' || host.endsWith('.localhost') || host==='::1' || host==='[::1]' || /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host))throw new Error(`${name} must use a public HTTPS origin`);
  return url.origin;
}
export function backendOrigin(env=process.env) {
  const value=env.EARTHSHIFT_BACKEND_URL?.trim();
  const cloud=env.VERCEL==='1' || env.NODE_ENV==='production';
  if(cloud)return value?publicOrigin(value,'EARTHSHIFT_BACKEND_URL'):null;
  if(!value)return 'http://127.0.0.1:8000';
  const url=new URL(value);
  if(!['http:','https:'].includes(url.protocol) || url.username || url.password || url.pathname!=='/' || url.search || url.hash)throw new Error('Invalid EARTHSHIFT_BACKEND_URL');
  return url.origin;
}
