const LAYERS = new Set([
  'MODIS_Terra_CorrectedReflectance_TrueColor','MODIS_Terra_Thermal_Anomalies_All',
  'BlueMarble_NextGeneration','VIIRS_Black_Marble','VIIRS_SNPP_CorrectedReflectance_TrueColor',
  'MODIS_Terra_Land_Surface_Temp_Day','IMERG_Precipitation_Rate','MODIS_Terra_NDVI_8Day',
]);
export function resolveGibsTile(tilePath) {
  if (typeof tilePath !== 'string' || tilePath.startsWith('/') || /\.\.|:\/\/|[?#%\\]/.test(tilePath)) throw new Error('invalid_gibs_path');
  const parts=tilePath.split('/');
  if(parts.length!==7)throw new Error('invalid_gibs_path');
  const [layer,style,time,matrixSet,matrix,row,tileFile]=parts;
  if(!LAYERS.has(layer))throw new Error('unsupported_gibs_layer');
  if(style!=='default'||!/^(default|\d{4}-\d{2}-\d{2})$/.test(time)||!/^\d+$/.test(matrix)||!/^\d+$/.test(row)||!/^\d+\.(jpg|png)$/.test(tileFile))throw new Error('invalid_gibs_tile');
  // The equirectangular globe uses geographic matrices; Cesium's overlays use Web Mercator.
  const projection=/^GoogleMapsCompatible_Level\d+$/.test(matrixSet)?'epsg3857':/^(250m|500m|1km|2km)$/.test(matrixSet)?'epsg4326':null;
  if(!projection)throw new Error('invalid_gibs_matrix_set');
  return `https://gibs.earthdata.nasa.gov/wmts/${projection}/best/${tilePath}`;
}
