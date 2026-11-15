
from alerts import generate_findings


def create_scenario(name, ndvi, precipitation):
    return {
        "cell_id": name,
        "period": "2021-2025",
        "years": [2021, 2022, 2023, 2024, 2025],
        "ndvi_values": ndvi,
        "precipitation_values": precipitation,
        "quality": {
            "variables": {
                "ndvi": {"valid_fraction": 0.95},
                "precipitation": {"valid_fraction": 0.95}
            }
        }
    }


scenarios = [
    (
        "Vegetacion disminuye y lluvia aumenta",
        [0.62, 0.59, 0.55, 0.52, 0.48],
        [450, 480, 510, 530, 550]
    ),
    (
        "Vegetacion y lluvia aumentan",
        [0.40, 0.45, 0.50, 0.55, 0.60],
        [400, 430, 460, 490, 520]
    ),
    (
        "Vegetacion disminuye y lluvia disminuye",
        [0.65, 0.60, 0.55, 0.50, 0.45],
        [550, 520, 490, 460, 430]
    ),
    (
        "Vegetacion y lluvia estables",
        [0.50, 0.50, 0.50, 0.50, 0.50],
        [500, 500, 500, 500, 500]
    )
]


for index, (name, ndvi, precipitation) in enumerate(
    scenarios, start=1
):
    data = create_scenario(
        f"scenario-{index}",
        ndvi,
        precipitation
    )

    print(f"\nESCENARIO {index}: {name}")

    findings = generate_findings(data)

    assert len(findings) == 3

    for finding in findings:
        print(
            f"  {finding['engine']}: "
            f"{finding['level']}"
        )

        print(
            f"  Explicacion: "
            f"{finding['explanation']}"
        )

print("\nESCENARIOS EJECUTADOS")
print("Revisar si las clasificaciones son coherentes.")
