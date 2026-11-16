import type {Request,Response} from 'express';
import app from '../app.js';

const INTERNAL_ROUTE_PARAM='__earthshift_path';

function withoutInternalRouteParam(query:string):string {
  return query
    .split('&')
    .filter(Boolean)
    .filter(pair=>{
      const key=pair.split('=',1)[0] ?? '';
      try { return decodeURIComponent(key)!==INTERNAL_ROUTE_PARAM; }
      catch { return key!==INTERNAL_ROUTE_PARAM; }
    })
    .join('&');
}

// Vercel sends every /api/* request to this one shared Express function.
export default function handler(req:Request,res:Response) {
  const url=new URL(req.url || '/api','https://earthshift.invalid');
  const route=url.searchParams.get(INTERNAL_ROUTE_PARAM);
  if(route!==null){
    // Preserve the remaining query byte-for-byte. URLSearchParams.toString()
    // re-encodes %2F and can double-encode NASA GIBS tile paths.
    const query=withoutInternalRouteParam(url.search.replace(/^\?/,''));
    req.url='/api'+(route?'/'+route:'')+(query?'?'+query:'');
    // Express derives query parameters from the reconstructed URL.
    Reflect.deleteProperty(req,'query');
  }
  return app(req,res);
}
