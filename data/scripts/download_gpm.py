
import earthaccess

print("Autenticando con NASA Earthdata...")

auth = earthaccess.login(persist=True)

if not auth.authenticated:
    raise RuntimeError("Error de autenticacion NASA")

print("Conexion correcta.")

print("\nConsultando GPM IMERG V07...")

resultados = earthaccess.search_data(
    short_name="GPM_3IMERGM",
    version="07",
    temporal=("2000-01-01", "2026-12-31"),
    count=1000
)

print("\nCONSULTA FINALIZADA")
print("Total de archivos encontrados:", len(resultados))

if resultados:
    print("\nPrimer archivo:")
    print(resultados[0])

    print("\nUltimo archivo:")
    print(resultados[-1])

print("\nTodavia no se ha descargado ningun archivo.")
