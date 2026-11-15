
from datetime import date

from backend.app.data_sources.noaa_service import fetch_roni_data
from backend.app.data_sources.noaa_parser import (
    parse_roni_data,
    detect_roni_events,
)


NOAA_SOURCE = {
    "name": "NOAA Climate Prediction Center",
    "index": "RONI",
    "url": "https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt",
    "description": (
        "Indice historico de anomalias relativas de temperatura "
        "superficial del mar utilizado para el seguimiento de ENSO."
    ),
}


def parse_period(period: str) -> tuple[int, int]:
    """Valida un periodo expresado como YYYY-YYYY."""

    try:
        start_year, end_year = map(int, period.split("-"))
    except (ValueError, AttributeError):
        raise ValueError(
            "El periodo debe tener el formato YYYY-YYYY."
        )

    if start_year < 1950 or end_year > 2100:
        raise ValueError("El periodo esta fuera del rango permitido.")

    if start_year > end_year:
        raise ValueError("El anio inicial supera al anio final.")

    return start_year, end_year


def get_noaa_events(
    start_year: int,
    end_year: int,
) -> tuple[list[dict], list[dict]]:
    """
    Descarga los registros RONI y obtiene los eventos
    que coinciden con el periodo solicitado.
    """

    raw_data = fetch_roni_data()

    records = parse_roni_data(raw_data)

    all_events = detect_roni_events(records)

    selected_records = [
        record
        for record in records
        if start_year <= record["year"] <= end_year
    ]

    period_start = date(start_year, 1, 1)
    period_end = date(end_year, 12, 1)

    selected_events = []

    for event in all_events:
        original_start = date.fromisoformat(event["start_date"])
        original_end = date.fromisoformat(event["end_date"])

        if original_end < period_start or original_start > period_end:
            continue

        selected_event = event.copy()

        selected_event["overlap_start_date"] = max(
            original_start, period_start
        ).isoformat()

        selected_event["overlap_end_date"] = min(
            original_end, period_end
        ).isoformat()

        selected_event["overlaps_requested_period"] = True

        selected_events.append(selected_event)

    return selected_records, selected_events


def compare_temporal_anomalies(
    anomalies: list[dict],
    events: list[dict],
    roni_records: list[dict],
) -> list[dict]:
    """Compare engine anomaly intervals with NOAA episodes without causal claims."""
    comparisons = []
    for anomaly in anomalies:
        start_text = anomaly.get("start_date") or anomaly.get("date")
        end_text = anomaly.get("end_date") or anomaly.get("date")
        if not start_text or not end_text:
            continue
        anomaly_start = date.fromisoformat(start_text)
        anomaly_end = date.fromisoformat(end_text)

        for event in events:
            event_start = date.fromisoformat(event["overlap_start_date"])
            event_end = date.fromisoformat(event["overlap_end_date"])
            shared_start = max(anomaly_start, event_start)
            shared_end = min(anomaly_end, event_end)
            if shared_start > shared_end:
                continue

            comparisons.append({
                "anomaly_start": anomaly_start.isoformat(),
                "anomaly_end": anomaly_end.isoformat(),
                "variable": anomaly.get("variable"),
                "anomaly_value": anomaly.get("value"),
                "unit": anomaly.get("unit"),
                "engine": anomaly.get("engine"),
                "temporal_resolution": anomaly.get("temporal_resolution", "unknown"),
                "phenomenon": event["phenomenon"],
                "roni_index": event["index"],
                "event_start": event["start_date"],
                "event_end": event["end_date"],
                "shared_start": shared_start.isoformat(),
                "shared_end": shared_end.isoformat(),
                "temporal_overlap": True,
                "evidence_type": "temporal_coincidence",
                "causality_established": False,
                "interpretation_note": (
                    "Coincidencia temporal descriptiva. La anomalia EarthShift conserva "
                    "su resolucion temporal original y no demuestra causalidad ni impacto local."
                ),
            })
    return comparisons

def investigate_phenomena(
    region: str,
    period: str,
    engine_results: dict | None = None,
) -> dict:
    """
    Servicio principal de investigacion de fenomenos ambientales.

    Obtiene eventos NOAA y prepara comparaciones temporales
    con anomalias de los motores cientificos de EarthShift.
    """

    if not isinstance(region, str) or not region.strip():
        raise ValueError("Debe especificarse una region.")

    start_year, end_year = parse_period(period)

    records, events = get_noaa_events(
        start_year,
        end_year,
    )

    if engine_results is None:
        engine_results = {}

    if not isinstance(engine_results, dict):
        raise ValueError(
            "engine_results debe ser un objeto."
        )

    anomalies = engine_results.get("anomalies", [])

    if not isinstance(anomalies, list):
        raise ValueError(
            "El campo anomalies debe contener una lista."
        )

    # Validar las anomalías antes de compararlas.
    for index, anomaly in enumerate(anomalies):

        if not isinstance(anomaly, dict):
            raise ValueError(
                f"La anomalia en la posicion {index} debe ser un objeto."
            )

        anomaly_start = anomaly.get("start_date") or anomaly.get("date")
        anomaly_end = anomaly.get("end_date") or anomaly.get("date")

        if not isinstance(anomaly_start, str) or not isinstance(anomaly_end, str):
            raise ValueError(
                f"La anomalia en la posicion {index} no contiene un periodo valido."
            )

        try:
            start_value = date.fromisoformat(anomaly_start)
            end_value = date.fromisoformat(anomaly_end)
        except ValueError:
            raise ValueError(
                f"El periodo de la anomalia en la posicion {index} no es valido."
            )

        if start_value > end_value:
            raise ValueError(
                f"El periodo de la anomalia en la posicion {index} esta invertido."
            )

        variable = anomaly.get("variable")

        if not isinstance(variable, str) or not variable.strip():
            raise ValueError(
                f"La anomalia en la posicion {index} no indica su variable."
            )

    comparisons = compare_temporal_anomalies(
        anomalies,
        events,
        records,
    )

    return {
        "region": region,
        "period": period,

        "phenomena": events,

        "temporal_comparisons": comparisons,

        "evidence": [
            {
                "source": NOAA_SOURCE["name"],
                "index": NOAA_SOURCE["index"],
                "url": NOAA_SOURCE["url"],
                "description": NOAA_SOURCE["description"],
                "records_analyzed": len(records),
            }
        ],

        "limitations": [
            "RONI representa condiciones oceanicas del Pacifico tropical.",
            "La coincidencia temporal no demuestra causalidad.",
            "Los eventos identificados son tramos preliminares "
            "del algoritmo RONI y requieren validacion oficial.",
            "No se han establecido impactos especificos para la region.",
            "Las comparaciones requieren anomalias mensuales "
            "procedentes de los motores cientificos de EarthShift."
        ],

        "sources": [NOAA_SOURCE],
    }
