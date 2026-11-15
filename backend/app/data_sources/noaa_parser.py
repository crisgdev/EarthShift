
from datetime import date


SEASON_CENTER_MONTH = {
    "DJF": 1,
    "JFM": 2,
    "FMA": 3,
    "MAM": 4,
    "AMJ": 5,
    "MJJ": 6,
    "JJA": 7,
    "JAS": 8,
    "ASO": 9,
    "SON": 10,
    "OND": 11,
    "NDJ": 12,
}


def parse_roni_data(
    raw_text: str,
    start_year: int | None = None,
    end_year: int | None = None,
) -> list[dict]:
    """
    Convierte el archivo ASCII RONI de NOAA en registros estructurados.

    Args:
        raw_text: Contenido original descargado de NOAA.
        start_year: Año inicial opcional.
        end_year: Año final opcional.

    Returns:
        Lista de registros con fecha, temporada e índice RONI.
    """

    if not raw_text or not raw_text.strip():
        raise ValueError("El contenido RONI está vacío.")

    if start_year is not None and end_year is not None:
        if start_year > end_year:
            raise ValueError("El año inicial no puede superar al final.")

    lines = raw_text.strip().splitlines()

    header = lines[0].split()

    if header != ["SEAS", "YR", "ANOM"]:
        raise ValueError(
            "La estructura del archivo NOAA no coincide "
            "con las columnas SEAS, YR y ANOM."
        )

    records = []

    for line_number, line in enumerate(lines[1:], start=2):
        columns = line.split()

        if len(columns) != 3:
            raise ValueError(
                f"Formato inválido en la línea {line_number} de NOAA."
            )

        season, year_text, anomaly_text = columns

        if season not in SEASON_CENTER_MONTH:
            raise ValueError(
                f"Temporada desconocida en la línea {line_number}: "
                f"{season}"
            )

        try:
            year = int(year_text)
            anomaly = float(anomaly_text)
        except ValueError as error:
            raise ValueError(
                f"Valor numérico inválido en la línea {line_number}."
            ) from error

        if not (-10 <= anomaly <= 10):
            raise ValueError(
                f"Anomalía fuera del rango de validación "
                f"en la línea {line_number}: {anomaly}"
            )

        if start_year is not None and year < start_year:
            continue

        if end_year is not None and year > end_year:
            continue

        center_month = SEASON_CENTER_MONTH[season]

        records.append({
            "year": year,
            "season": season,
            "month": center_month,
            "date": date(year, center_month, 1).isoformat(),
            "roni_anomaly_c": anomaly,
            "unit": "°C",
            "source": "NOAA CPC",
            "index": "RONI",
        })

    if not records:
        raise ValueError(
            "No se encontraron registros RONI para el periodo solicitado."
        )

    return records

def detect_roni_events(records: list[dict]) -> list[dict]:
    """
    Identifica episodios históricos cálidos y fríos según
    el criterio NOAA: cinco temporadas consecutivas como mínimo.

    No clasifica intensidad ni establece impactos regionales.
    """

    if not records:
        return []

    ordered = sorted(
        records,
        key=lambda item: (item["year"], item["month"])
    )

    events = []
    current_group = []

    def classify_group(group):
        if len(group) < 5:
            return None

        values = [item["roni_anomaly_c"] for item in group]

        return {
            "phenomenon": (
                "El Niño" if values[0] >= 0.5 else "La Niña"
            ),
            "index": "RONI",
            "start_date": group[0]["date"],
            "end_date": group[-1]["date"],
            "start_season": group[0]["season"],
            "end_season": group[-1]["season"],
            "start_year": group[0]["year"],
            "end_year": group[-1]["year"],
            "seasons_count": len(group),
            "peak_anomaly_c": (
                max(values) if values[0] >= 0.5 else min(values)
            ),
            "unit": "°C",
            "source": "NOAA CPC",
            "classification_rule": (
                "Al menos cinco temporadas trimestrales "
                "superpuestas consecutivas con RONI >= +0.5 °C "
                "o RONI <= -0.5 °C."
            )
        }

    for record in ordered:
        value = record["roni_anomaly_c"]

        if value >= 0.5:
            polarity = "warm"
        elif value <= -0.5:
            polarity = "cold"
        else:
            polarity = None

        if not current_group:
            if polarity:
                current_group = [record]
            continue

        previous = current_group[-1]
        previous_value = previous["roni_anomaly_c"]

        previous_polarity = (
            "warm" if previous_value >= 0.5
            else "cold" if previous_value <= -0.5
            else None
        )

        same_polarity = polarity == previous_polarity

        # Verifica continuidad entre temporadas trimestrales.
        expected_month = previous["month"] % 12 + 1
        expected_year = previous["year"] + (
            1 if previous["month"] == 12 else 0
        )

        consecutive = (
            record["month"] == expected_month
            and record["year"] == expected_year
        )

        if polarity and same_polarity and consecutive:
            current_group.append(record)
        else:
            event = classify_group(current_group)

            if event:
                events.append(event)

            current_group = [record] if polarity else []

    final_event = classify_group(current_group)

    if final_event:
        events.append(final_event)

    return events
