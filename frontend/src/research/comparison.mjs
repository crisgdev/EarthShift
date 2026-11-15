const DEFAULT_FILL_VALUE = -999;

const SUPPORTED_VARIABLES = new Set([
  'precipitation',
  'air_temperature',
  'ndvi',
  'lst',
  'soil_moisture',
]);

const sourceCache = new Map();


function isValidIsoDate(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return (
    date.toISOString().slice(0, 10) === value
  );
}


export function datesBetween(start, end) {
  if (!isValidIsoDate(start)) {
    throw new Error('invalid_start_date');
  }

  if (!isValidIsoDate(end)) {
    throw new Error('invalid_end_date');
  }

  const startDate = new Date(
    `${start}T00:00:00Z`
  );

  const endDate = new Date(
    `${end}T00:00:00Z`
  );

  if (startDate > endDate) {
    throw new Error('invalid_date_range');
  }

  const result = [];

  const current = new Date(startDate);

  while (current <= endDate) {
    result.push(
      current.toISOString().slice(0, 10)
    );

    current.setUTCDate(
      current.getUTCDate() + 1
    );
  }

  return result;
}


export function cleanValue(
  value,
  fillValue = DEFAULT_FILL_VALUE,
  variable = 'precipitation'
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  if (number === Number(fillValue)) {
    return null;
  }

  if (
    variable === 'precipitation' &&
    number < 0
  ) {
    return null;
  }

  return number;
}


function monthKey(date) {
  return date.slice(0, 7);
}


function daysInMonth(year, month) {
  return new Date(
    Date.UTC(year, month, 0)
  ).getUTCDate();
}


function calculateLinearSlope(points) {
  if (points.length < 2) {
    return null;
  }

  const xs = points.map(
    (item) => item.year
  );

  const ys = points.map(
    (item) => item.value
  );

  const xMean =
    xs.reduce((a, b) => a + b, 0) /
    xs.length;

  const yMean =
    ys.reduce((a, b) => a + b, 0) /
    ys.length;

  let numerator = 0;
  let denominator = 0;

  for (
    let index = 0;
    index < points.length;
    index += 1
  ) {
    const dx =
      xs[index] - xMean;

    numerator +=
      dx * (ys[index] - yMean);

    denominator += dx * dx;
  }

  if (denominator === 0) {
    return null;
  }

  return numerator / denominator;
}


function buildAnnualTrend(
  cleanedSeries,
  variable
) {
  const grouped = new Map();

  for (const point of cleanedSeries) {
    const year = Number(
      point.date.slice(0, 4)
    );

    if (!grouped.has(year)) {
      grouped.set(year, []);
    }

    grouped.get(year).push(point);
  }

  const annual = [];

  for (
    const [year, points]
    of grouped.entries()
  ) {
    const expected =
      datesBetween(
        `${year}-01-01`,
        `${year}-12-31`
      ).length;

    if (points.length !== expected) {
      continue;
    }

    const valid = points.filter(
      (item) =>
        item.value !== null
    );

    if (valid.length !== expected) {
      continue;
    }

    let value;

    if (variable === 'precipitation') {
      value = valid.reduce(
        (sum, item) =>
          sum + item.value,
        0
      );
    } else {
      value =
        valid.reduce(
          (sum, item) =>
            sum + item.value,
          0
        ) / valid.length;
    }

    annual.push({
      year,
      value,
    });
  }

  annual.sort(
    (a, b) => a.year - b.year
  );

  if (annual.length < 5) {
    return null;
  }

  const slope =
    calculateLinearSlope(annual);

  if (slope === null) {
    return null;
  }

  return {
    points: annual.length,
    annualSlope: slope,
    significance: null,
    uncertainty: null,
    method:
      'descriptive_linear_slope',
  };
}


export function summarize(
  series,
  variable
) {
  if (
    !Array.isArray(series) ||
    series.length === 0
  ) {
    return {
      expected: 0,
      valid: 0,
      mean: null,
      total: null,
      minimum: null,
      maximum: null,
      complete: false,
      monthly: [],
      trend: null,
    };
  }

  const sorted = [...series]
    .map((item) => ({
      date: item.date,
      value: cleanValue(
        item.value,
        DEFAULT_FILL_VALUE,
        variable
      ),
    }))
    .sort((a, b) =>
      a.date.localeCompare(b.date)
    );

  const start = sorted[0].date;

  const end =
    sorted[sorted.length - 1].date;

  const expected =
    datesBetween(start, end).length;

  const byDate = new Map(
    sorted.map((item) => [
      item.date,
      item.value,
    ])
  );

  const completeSeries =
    datesBetween(start, end).map(
      (date) => ({
        date,
        value:
          byDate.has(date)
            ? byDate.get(date)
            : null,
      })
    );

  const validValues =
    completeSeries
      .filter(
        (item) =>
          item.value !== null
      )
      .map(
        (item) => item.value
      );

  const valid =
    validValues.length;

  const mean =
    valid > 0
      ? validValues.reduce(
          (a, b) => a + b,
          0
        ) / valid
      : null;

  const total =
    variable === 'precipitation' &&
    valid > 0
      ? validValues.reduce(
          (a, b) => a + b,
          0
        )
      : null;

  const minimum =
    valid > 0
      ? Math.min(...validValues)
      : null;

  const maximum =
    valid > 0
      ? Math.max(...validValues)
      : null;

  const monthGroups =
    new Map();

  for (
    const point
    of completeSeries
  ) {
    const key =
      monthKey(point.date);

    if (!monthGroups.has(key)) {
      monthGroups.set(key, []);
    }

    monthGroups.get(key).push(
      point
    );
  }

  const monthly = [];

  for (
    const [key, points]
    of monthGroups.entries()
  ) {
    const [yearText, monthText] =
      key.split('-');

    const year =
      Number(yearText);

    const month =
      Number(monthText);

    const expectedMonthDays =
      daysInMonth(year, month);

    const monthStart =
      `${key}-01`;

    const monthEnd =
      `${key}-${String(
        expectedMonthDays
      ).padStart(2, '0')}`;

    const hasFullCalendarMonth =
      start <= monthStart &&
      end >= monthEnd &&
      points.length ===
        expectedMonthDays;

    const validMonth =
      points.filter(
        (item) =>
          item.value !== null
      );

    const completeMonth =
      hasFullCalendarMonth &&
      validMonth.length ===
        expectedMonthDays;

    let value = null;

    if (completeMonth) {
      if (
        variable ===
        'precipitation'
      ) {
        value =
          validMonth.reduce(
            (sum, item) =>
              sum + item.value,
            0
          );
      } else {
        value =
          validMonth.reduce(
            (sum, item) =>
              sum + item.value,
            0
          ) /
          validMonth.length;
      }
    }

    monthly.push({
      month: key,
      value,
      valid:
        validMonth.length,
      expected:
        expectedMonthDays,
      complete:
        completeMonth,
    });
  }

  return {
    expected,
    valid,
    mean,
    total,
    minimum,
    maximum,
    complete:
      valid === expected,
    monthly,
    trend:
      buildAnnualTrend(
        completeSeries,
        variable
      ),
  };
}


export function pairedDifference(
  seriesA,
  seriesB
) {
  const mapB = new Map(
    seriesB.map((item) => [
      item.date,
      item.value,
    ])
  );

  const differences = [];

  for (const point of seriesA) {
    if (!mapB.has(point.date)) {
      continue;
    }

    const a =
      cleanValue(
        point.value,
        DEFAULT_FILL_VALUE,
        'air_temperature'
      );

    const b =
      cleanValue(
        mapB.get(point.date),
        DEFAULT_FILL_VALUE,
        'air_temperature'
      );

    if (
      a === null ||
      b === null
    ) {
      continue;
    }

    differences.push(
      a - b
    );
  }

  return {
    valid:
      differences.length,

    meanDifference:
      differences.length > 0
        ? differences.reduce(
            (sum, value) =>
              sum + value,
            0
          ) /
          differences.length
        : null,
  };
}


export function selectionTransition(
  state,
  action
) {
  const next = {
    areas: [
      state.areas?.[0] ?? null,
      state.areas?.[1] ?? null,
    ],
    editing:
      state.editing ?? 0,
  };

  if (action.type === 'select') {
    next.areas[
      next.editing
    ] = action.area;

    return next;
  }

  if (action.type === 'swap') {
    next.areas = [
      next.areas[1],
      next.areas[0],
    ];

    return next;
  }

  if (action.type === 'clear') {
    const index =
      Number(action.index);

    if (
      index === 0 ||
      index === 1
    ) {
      next.areas[index] = null;
    }

    return next;
  }

  if (action.type === 'edit') {
    const index =
      Number(action.index);

    if (
      index === 0 ||
      index === 1
    ) {
      next.editing = index;
    }

    return next;
  }

  return next;
}


function validateArea(area) {
  if (
    !area ||
    !Number.isFinite(
      Number(area.lat)
    ) ||
    !Number.isFinite(
      Number(area.lon)
    ) ||
    !Number.isFinite(
      Number(area.radiusKm)
    )
  ) {
    throw new Error(
      'invalid_area'
    );
  }

  const lat =
    Number(area.lat);

  const lon =
    Number(area.lon);

  const radiusKm =
    Number(area.radiusKm);

  if (
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    throw new Error(
      'invalid_coordinates'
    );
  }

  if (
    radiusKm <= 0 ||
    radiusKm > 500
  ) {
    throw new Error(
      'invalid_radius'
    );
  }
}


function validatePeriod(period) {
  if (
    !period ||
    !isValidIsoDate(
      period.start
    ) ||
    !isValidIsoDate(
      period.end
    )
  ) {
    throw new Error(
      'invalid_period'
    );
  }

  datesBetween(
    period.start,
    period.end
  );

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  if (
    period.start > today ||
    period.end > today
  ) {
    throw new Error(
      'future_period_not_allowed'
    );
  }
}


export function validateRequest(
  input
) {
  if (
    !input ||
    !Array.isArray(input.areas) ||
    input.areas.length !== 2
  ) {
    throw new Error(
      'two_areas_required'
    );
  }

  input.areas.forEach(
    validateArea
  );

  validatePeriod(
    input.period
  );

  if (
    input.separatePeriods
  ) {
    validatePeriod(
      input.periodB
    );
  }

  if (
    !Array.isArray(
      input.variables
    ) ||
    input.variables.length === 0
  ) {
    throw new Error(
      'variables_required'
    );
  }

  for (
    const variable
    of input.variables
  ) {
    if (
      !SUPPORTED_VARIABLES.has(
        variable
      )
    ) {
      throw new Error(
        `unsupported_variable:${variable}`
      );
    }
  }

  const mode =
    input.mode ?? 'real';

  if (
    mode !== 'real' &&
    mode !== 'synthetic'
  ) {
    throw new Error(
      'invalid_mode'
    );
  }

  return true;
}


function formatPowerDate(
  isoDate
) {
  return isoDate.replace(
    /-/g,
    ''
  );
}


function powerParameterFor(
  variable
) {
  if (
    variable ===
    'precipitation'
  ) {
    return 'PRECTOTCORR';
  }

  if (
    variable ===
    'air_temperature'
  ) {
    return 'T2M';
  }

  return null;
}


function variableUnit(
  variable
) {
  if (
    variable ===
    'precipitation'
  ) {
    return 'mm/day';
  }

  if (
    variable ===
    'air_temperature'
  ) {
    return '°C';
  }

  if (
    variable === 'ndvi'
  ) {
    return 'index';
  }

  if (
    variable === 'lst'
  ) {
    return '°C';
  }

  if (
    variable ===
    'soil_moisture'
  ) {
    return 'm³/m³';
  }

  return null;
}


function unavailableVariable(
  variable,
  dates,
  reason =
    'not_implemented'
) {
  const series = dates.map(
    (date) => ({
      date,
      value: null,
    })
  );

  const stats =
    summarize(
      series,
      variable
    );

  return {
    variable,
    status: 'unavailable',
    reason,
    unit:
      variableUnit(variable),
    series,
    stats,
    evidence: {
      source:
        variable === 'ndvi'
          ? 'MODIS NDVI'
          : variable === 'lst'
          ? 'MODIS LST'
          : variable ===
              'soil_moisture'
          ? 'GLDAS Soil Moisture'
          : null,

      sourceUrl: '',

      productVersion: null,

      rawDataStatus:
        'unavailable',

      dataStatus:
        'unavailable',

      method:
        'not_implemented',

      valid: 0,

      expected:
        dates.length,

      integrationContract: {
        status:
          'not_implemented',
      },
    },
  };
}


function syntheticPrecipitation(
  dates,
  areaIndex
) {
  return dates.map(
    (date, index) => {
      const seasonal =
        2.5 +
        1.8 *
          Math.sin(
            (index / 30) *
              Math.PI *
              2
          );

      const areaOffset =
        areaIndex * 0.4;

      return {
        date,
        value: Math.max(
          0,
          Number(
            (
              seasonal +
              areaOffset
            ).toFixed(3)
          )
        ),
      };
    }
  );
}


function syntheticVariable(
  variable,
  dates,
  areaIndex
) {
  if (
    variable !==
    'precipitation'
  ) {
    return unavailableVariable(
      variable,
      dates,
      'not_available_in_synthetic_demo'
    );
  }

  const series =
    syntheticPrecipitation(
      dates,
      areaIndex
    );

  return {
    variable,
    status: 'simulated',
    reason: null,
    unit:
      variableUnit(variable),
    series,
    stats:
      summarize(
        series,
        variable
      ),
    evidence: {
      source:
        'EarthShift synthetic demonstration',

      sourceUrl: '',

      productVersion:
        'synthetic-v1',

      rawDataStatus:
        'simulated',

      dataStatus:
        'simulated',

      method:
        'deterministic_synthetic_demo',

      valid:
        series.length,

      expected:
        dates.length,

      integrationContract: {
        status:
          'simulated',
      },
    },
  };
}


async function cachedFetchJson(
  url,
  fetcher
) {
  if (
    sourceCache.has(url)
  ) {
    return sourceCache.get(
      url
    );
  }

  const promise = (
    async () => {
      const response =
        await fetcher(url);

      if (
        !response ||
        response.ok === false
      ) {
        const status =
          response?.status;

        const error =
          new Error(
            status === 429
              ? 'rate_limit'
              : `upstream_http_${status ?? 'error'}`
          );

        error.code =
          status === 429
            ? 'rate_limit'
            : 'upstream_error';

        throw error;
      }

      return response.json();
    }
  )();

  sourceCache.set(
    url,
    promise
  );

  try {
    return await promise;
  } catch (error) {
    sourceCache.delete(url);
    throw error;
  }
}


function extractPowerSeries(
  raw,
  parameter,
  dates,
  variable
) {
  const fillValue =
    raw?.header?.fill_value ??
    DEFAULT_FILL_VALUE;

  const values =
    raw?.properties
      ?.parameter
      ?.[parameter] ??
    {};

  return dates.map(
    (date) => {
      const key =
        formatPowerDate(
          date
        );

      return {
        date,
        value:
          cleanValue(
            values[key],
            fillValue,
            variable
          ),
      };
    }
  );
}


function powerUrl(
  area,
  period
) {
  const parameters = [
    'PRECTOTCORR',
    'T2M',
  ].join(',');

  const params =
    new URLSearchParams({
      parameters,
      community: 'AG',
      longitude:
        String(area.lon),
      latitude:
        String(area.lat),
      start:
        formatPowerDate(
          period.start
        ),
      end:
        formatPowerDate(
          period.end
        ),
      format: 'JSON',
    });

  return (
    'https://power.larc.nasa.gov/' +
    'api/temporal/daily/point?' +
    params.toString()
  );
}


async function buildRealSample(
  area,
  period,
  variables,
  fetcher
) {
  const dates =
    datesBetween(
      period.start,
      period.end
    );

  let raw = null;
  let upstreamError = null;

  const powerVariables =
    variables.filter(
      (variable) =>
        powerParameterFor(
          variable
        ) !== null
    );

  if (
    powerVariables.length > 0
  ) {
    try {
      raw =
        await cachedFetchJson(
          powerUrl(
            area,
            period
          ),
          fetcher
        );
    } catch (error) {
      upstreamError = error;
    }
  }

  const outputVariables = {};

  for (
    const variable
    of variables
  ) {
    const parameter =
      powerParameterFor(
        variable
      );

    if (!parameter) {
      outputVariables[
        variable
      ] =
        unavailableVariable(
          variable,
          dates
        );

      continue;
    }

    if (
      upstreamError ||
      !raw
    ) {
      const reason =
        upstreamError?.code ===
        'rate_limit'
          ? 'rate_limit'
          : 'upstream_unavailable';

      outputVariables[
        variable
      ] = {
        ...unavailableVariable(
          variable,
          dates,
          reason
        ),
        evidence: {
          ...unavailableVariable(
            variable,
            dates,
            reason
          ).evidence,

          source:
            'NASA POWER',

          sourceUrl:
            'https://power.larc.nasa.gov/',

          method:
            'nasa_power_daily_point',

          integrationContract: {
            status:
              'implemented',
          },
        },
      };

      continue;
    }

    const series =
      extractPowerSeries(
        raw,
        parameter,
        dates,
        variable
      );

    const stats =
      summarize(
        series,
        variable
      );

    outputVariables[
      variable
    ] = {
      variable,
      status:
        stats.valid > 0
          ? 'derived'
          : 'unavailable',

      reason:
        stats.valid > 0
          ? null
          : 'no_valid_values',

      unit:
        variableUnit(
          variable
        ),

      series,
      stats,

      evidence: {
        source:
          'NASA POWER',

        sourceUrl:
          'https://power.larc.nasa.gov/',

        productVersion:
          raw?.header?.api
            ?.version ??
          null,

        rawDataStatus:
          stats.valid > 0
            ? 'available'
            : 'unavailable',

        dataStatus:
          stats.valid > 0
            ? 'derived'
            : 'unavailable',

        method:
          'nasa_power_daily_point',

        valid:
          stats.valid,

        expected:
          stats.expected,

        integrationContract: {
          status:
            'implemented',
        },
      },
    };
  }

  return {
    area,
    period,
    variables:
      outputVariables,
  };
}


function buildSyntheticSample(
  area,
  period,
  variables,
  areaIndex
) {
  const dates =
    datesBetween(
      period.start,
      period.end
    );

  const outputVariables = {};

  for (
    const variable
    of variables
  ) {
    outputVariables[
      variable
    ] =
      syntheticVariable(
        variable,
        dates,
        areaIndex
      );
  }

  return {
    area,
    period,
    variables:
      outputVariables,
  };
}


function buildComparisons(
  samples,
  variables,
  separatePeriods
) {
  if (
    samples.length !== 2
  ) {
    return [];
  }

  return variables.map(
    (variable) => {
      const first =
        samples[0]
          .variables[
            variable
          ];

      const second =
        samples[1]
          .variables[
            variable
          ];

      let paired = null;

      if (
        !separatePeriods &&
        first &&
        second
      ) {
        paired =
          pairedDifference(
            first.series,
            second.series
          );
      }

      return {
        variable,
        areaA: {
          status:
            first?.status ??
            'unavailable',

          stats:
            first?.stats ??
            null,
        },

        areaB: {
          status:
            second?.status ??
            'unavailable',

          stats:
            second?.stats ??
            null,
        },

        paired,
      };
    }
  );
}


export async function compare(
  input,
  options = {}
) {
  validateRequest(input);

  const mode =
    input.mode ?? 'real';

  const separatePeriods =
    Boolean(
      input.separatePeriods
    );

  const periodA =
    input.period;

  const periodB =
    separatePeriods
      ? input.periodB
      : input.period;

  const fetcher =
    options.fetcher ??
    globalThis.fetch;

  if (
    mode === 'real' &&
    typeof fetcher !==
      'function'
  ) {
    throw new Error(
      'fetch_unavailable'
    );
  }

  const samples = [];

  for (
    let index = 0;
    index <
    input.areas.length;
    index += 1
  ) {
    const area =
      input.areas[index];

    const period =
      index === 0
        ? periodA
        : periodB;

    if (
      mode === 'synthetic'
    ) {
      samples.push(
        buildSyntheticSample(
          area,
          period,
          input.variables,
          index
        )
      );
    } else {
      samples.push(
        await buildRealSample(
          area,
          period,
          input.variables,
          fetcher
        )
      );
    }
  }

  return {
    generatedAt:
      new Date()
        .toISOString(),

    forecast: false,

    request: {
      mode,
      areas:
        input.areas,

      periods: [
        periodA,
        periodB,
      ],

      variables:
        input.variables,

      separatePeriods,
    },

    samples,

    comparisons:
      buildComparisons(
        samples,
        input.variables,
        separatePeriods
      ),

    limitations: [
      'Comparacion descriptiva.',
      'No demuestra causalidad.',
      'No constituye una prediccion.',
      'Variables no integradas se reportan como no disponibles.',
    ],
  };
}