import 'dotenv/config';
import {backendOrigin} from '../src/services/deploymentConfig.mjs';
if(process.env.VERCEL==='1') {
  if(!backendOrigin())throw new Error('Set EARTHSHIFT_BACKEND_URL in Vercel Production and Preview before deploying. Use the public HTTPS origin of FastAPI.');
}
