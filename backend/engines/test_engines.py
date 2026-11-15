
from paradox import detect_paradox
from collapse import detect_collapse
from reversal import detect_reversal

# PRUEBA 1: Earth Paradox
data1 = {
    "precipitation_change": 12,
    "ndvi_change": -8
}

result1 = detect_paradox(data1)
assert result1["level"] == "investigar"
print("PRUEBA 1: CORRECTA")

# PRUEBA 2: Silent Collapse
data2 = {
    "ndvi_values": [0.62, 0.59, 0.55, 0.52]
}

result2 = detect_collapse(data2)
assert result2["level"] == "investigar"
print("PRUEBA 2: CORRECTA")

# PRUEBA 3: Decision Reversal
data3 = {
    "single_variable_level": "normal",
    "multivariable_level": "investigar"
}

result3 = detect_reversal(data3)
assert result3["reversal_detected"] is True
print("PRUEBA 3: CORRECTA")

# PRUEBA 4: Datos faltantes
data4 = {
    "precipitation_change": None,
    "ndvi_change": -8
}

result4 = detect_paradox(data4)
assert result4["level"] == "sin datos"
print("PRUEBA 4: CORRECTA")

print("\nTODAS LAS PRUEBAS PASARON")
