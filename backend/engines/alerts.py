from paradox import detect_paradox
from collapse import detect_collapse
from reversal import detect_reversal
from quality import check_variable_quality


def generate_findings(data):
    """
    Ejecuta los motores EarthShift y genera findings.
    """

    findings = []

    engines = [
        (
            "earth_paradox",
            detect_paradox,
            ["ndvi", "precipitation"]
        ),
        (
            "silent_collapse",
            detect_collapse,
            ["ndvi"]
        ),
        (
            "decision_reversal",
            detect_reversal,
            ["ndvi", "precipitation"]
        )
    ]

    for index, (
        engine_name,
        engine_function,
        variables
    ) in enumerate(engines, start=1):

        # Revisar calidad
        quality_result = check_variable_quality(
            data.get("quality", {}),
            variables
        )

        finding_id = f"DEMO-{index:03d}"

        # Si no hay calidad suficiente
        if not quality_result["valid"]:

            findings.append({
                "finding_id": finding_id,
                "cell_id": data.get(
                    "cell_id",
                    "unknown"
                ),
                "period": data.get(
                    "period",
                    "unknown"
                ),
                "engine": engine_name,
                "level": "sin datos",
                "variables": variables,
                "evidence": {},
                "counterevidence": [],
                "quality": quality_result,
                "explanation": (
                    "No hay cobertura suficiente "
                    "para ejecutar este motor."
                ),
                "limitations": [
                    "Datos insuficientes.",
                    "Umbral de cobertura provisional."
                ],
                "demo": True
            })

            continue

        # Ejecutar motor
        result = engine_function(data)

        limitations = list(
            result.get(
                "limitations",
                []
            )
        )

        # Limitaciones generales
        limitations.extend([
            "Datos simulados.",
            "Umbral de cobertura provisional.",
            "No demuestra causalidad.",
            "No predice desastres."
        ])

        finding = {
            "finding_id": finding_id,
            "cell_id": data.get(
                "cell_id",
                "unknown"
            ),
            "period": data.get(
                "period",
                "unknown"
            ),
            "engine": engine_name,
            "level": result.get(
                "level",
                "sin datos"
            ),
            "variables": variables,
            "evidence": result.get(
                "evidence",
                {}
            ),
            "counterevidence": result.get(
                "counterevidence",
                []
            ),
            "quality": quality_result,
            "explanation": result.get(
                "explanation",
                ""
            ),
            "limitations": limitations,
            "demo": True
        }

        # Campos especiales de Decision Reversal
        if engine_name == "decision_reversal":

            finding["reversal_detected"] = (
                result.get(
                    "reversal_detected",
                    False
                )
            )

            finding["univariable_level"] = (
                result.get(
                    "univariable_level"
                )
            )

            finding["multivariable_level"] = (
                result.get(
                    "multivariable_level"
                )
            )

        findings.append(finding)

    return findings


if __name__ == "__main__":

    import json

    demo_data = {
        "cell_id": "piura_demo_001",

        "period": "2021-2025",

        "years": [
            2021,
            2022,
            2023,
            2024,
            2025
        ],

        "ndvi_values": [
            0.62,
            0.59,
            0.55,
            0.52,
            0.48
        ],

        "precipitation_values": [
            450,
            480,
            510,
            530,
            550
        ],

        "ndvi_reference": 0.60,

        "quality": {
            "variables": {
                "ndvi": {
                    "valid_fraction": 0.95
                },
                "precipitation": {
                    "valid_fraction": 0.95
                }
            }
        }
    }

    results = generate_findings(
        demo_data
    )

    print(
        json.dumps(
            results,
            indent=4,
            ensure_ascii=False
        )
    )