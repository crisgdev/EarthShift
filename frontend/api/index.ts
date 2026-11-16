import type {Request,Response} from 'express';
import app from '../app.js';

const INTERNAL_ROUTE_PARAM='__earthshift_path';
const INTERNAL_QUERY_PARAMS=new Set([INTERNAL_ROUTE_PARAM,'earthshiftApi']);

function withoutInternalQueryParams(query:string):string {
  return query
    .split('&')
    .filter(Boolean)
    .filter(pair=>{
      const key=pair.split('=',1)[0] ?? '';
      let decoded=key;
      try { decoded=decodeURIComponent(key); }
      catch { /* keep raw key */ }
      return !INTERNAL_QUERY_PARAMS.has(decoded);
    })
    .join('&');
}

// Vercel exposes the captured `:earthshiftApi*` route in this base64 header.
// It is a fallback for runtimes where the destination query is not visible.
function routeFromMatches(req:Request):string|null {
  const header=req.headers['x-now-route-matches'];
  if(typeof header!=='string') return null;
  try {
    const matches=JSON.parse(Buffer.from(header,'base64').toString('utf8')) as Record<string,unknown>;
    const route=matches.earthshiftApi ?? matches.path;
    return typeof route==='string'?route:null;
  } catch {
    return null;
  }
}

// Vercel sends every /api/* request to this one shared Express function.
export default function handler(req:Request,res:Response) {
  const url=new URL(req.url || '/api','https://earthshift.invalid');
  const route=url.searchParams.get(INTERNAL_ROUTE_PARAM) ?? routeFromMatches(req);
  if(route!==null){
    // Preserve the remaining query byte-for-byte. URLSearchParams.toString()
    // re-encodes %2F and can double-encode NASA GIBS tile paths.
    const query=withoutInternalQueryParams(url.search.replace(/^\?/,''));
    req.url='/api'+(route?'/'+route:'')+(query?'?'+query:'');
    // Express derives query parameters from the reconstructed URL.
    Reflect.deleteProperty(req,'query');
  }
  return app(req,res);
}
