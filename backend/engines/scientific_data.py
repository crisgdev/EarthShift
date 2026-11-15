
import pandas as pd


def get_scientific_data():
    """
    Datos ambientales simulados para EarthShift.
    Piura, Peru.

    NO representan observaciones reales de NASA.
    """

    data = {
        "year": [
            2021, 2022, 2023, 2024, 2025
        ],
        "ndvi": [
            0.62, 0.59, 0.55, 0.52, 0.48
        ],
        "precipitation_mm": [
            450, 480, 510, 530, 550
        ],
        "temperature_c": [
            29.0, 29.4, 29.8, 30.1, 30.5
        ],
        "valid_fraction": [
            0.90, 0.92, 0.88, 0.91, 0.93
        ]
    }

    return pd.DataFrame(data)


if __name__ == "__main__":
    df = get_scientific_data()

    print("\nEARTHSHIFT - DATOS DEMO")
    print(df.to_string(index=False))

    print("\nRESUMEN ESTADISTICO")
    print(df.describe())
