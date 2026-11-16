import type {Request,Response} from 'express';
import app from '../app.js';

// Vercel sends every /api/* request to this one shared Express function.
export default function handler(req:Request,res:Response) {
  const url=new URL(req.url || '/api','https://earthshift.invalid');
  const route=url.searchParams.get('__earthshift_path');
  if(route!==null){
    url.searchParams.delete('__earthshift_path');
    req.url='/api'+(route?'/'+route:'')+(url.searchParams.size?'?'+url.searchParams.toString():'');
    // Express derives query parameters from the reconstructed URL.
    Reflect.deleteProperty(req,'query');
  }
  return app(req,res);
}
