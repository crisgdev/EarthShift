from pathlib import Path
import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[3]
DATA_DIR = BASE_DIR / "data" / "processed"


def load_csv(filename):
    path = DATA_DIR / filename

    if not path.exists():
        raise FileNotFoundError(
            f"No existe el archivo: {path}"
        )

    return pd.read_csv(path)


def load_statistics():
    return load_csv("estadisticas.csv")


def load_anomalies():
    return load_csv("anomalias.csv")


def load_correlations():
    return load_csv("correlaciones.csv")


def load_autocorrelation():
    return load_csv("autocorrelacion_lag1.csv")


def list_processed_files():
    if not DATA_DIR.exists():
        return []

    return sorted([
        file.name
        for file in DATA_DIR.iterdir()
        if file.is_file()
    ])


if __name__ == "__main__":
    print("DATA DIR:")
    print(DATA_DIR)

    print("\nARCHIVOS:")
    for filename in list_processed_files():
        print("-", filename)

    print("\nESTADISTICAS:")
    print(load_statistics().head())

    print("\nANOMALIAS:")
    print(load_anomalies().head())