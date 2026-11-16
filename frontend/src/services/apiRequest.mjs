export class EarthshiftApiError extends Error {
  constructor(code,status=0) {
    super('Datos no disponibles temporalmente.');
    this.name='EarthshiftApiError';this.code=code;this.status=status;
  }
}
export async function requestJson(url, init={}, fetcher=fetch) {
  const abort=new AbortController();
  const cancel=()=>abort.abort(init.signal?.reason);
  if(init.signal?.aborted)cancel();else init.signal?.addEventListener('abort',cancel,{once:true});
  const timeout=setTimeout(()=>abort.abort(),90000);
  try {
    const response=await fetcher(url,{...init,signal:abort.signal});
    if(!response.ok)throw new EarthshiftApiError(response.status===503?'backend_unavailable':'request_failed',response.status);
    // A Vite/static-host fallback can return index.html with HTTP 200 for an API path.
    if(!response.headers.get('content-type')?.includes('application/json'))throw new EarthshiftApiError('invalid_api_response',response.status);
    try {return await response.json();}catch{throw new EarthshiftApiError('invalid_api_response',response.status);}
  } catch(error) {
    if(init.signal?.aborted)throw error;
    if(error instanceof EarthshiftApiError)throw error;
    throw new EarthshiftApiError(abort.signal.aborted?'request_timeout':'backend_unavailable');
  } finally {
    clearTimeout(timeout);init.signal?.removeEventListener('abort',cancel);
  }
}
