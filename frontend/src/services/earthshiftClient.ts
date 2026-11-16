// In production, use the same origin unless an explicit API origin is configured.
import {requestJson} from './apiRequest.mjs';
import {publicOrigin} from './deploymentConfig.mjs';
const configuredOrigin=(import.meta.env.VITE_EARTHSHIFT_API_URL || '').trim();
export const API_BASE = configuredOrigin ? (import.meta.env.PROD ? publicOrigin(configuredOrigin,'VITE_EARTHSHIFT_API_URL') : configuredOrigin.replace(/\/$/,'')) : '';
export async function earthshift<T = any>(path: string, init?: RequestInit): Promise<T> {
  return requestJson(API_BASE + '/api' + path, init) as Promise<T>;
}
export function requireReal<T extends {source?: string; demo?: boolean}>(data:T):T {
  if (data.source !== 'processed_real_data' || data.demo !== false) throw new Error('Datos no disponibles temporalmente.');
  return data;
}
