import os
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)

def evaluar_y_exportar_modelo():
    base_dir = os.path.dirname(__file__)
    ruta_csv = os.path.join(base_dir, "datos_trabajadores.csv")
    ruta_pkl = os.path.join(base_dir, "motor_predictivo_safeshift.pkl")

    # 1. Cargar el dataset sintético (1.000 registros bajo Ley 19.628)
    df = pd.read_csv(ruta_csv)

    # 2. Definir variables predictoras (X) y etiqueta de riesgo multiclase (y)
    columnas_x = ["Horas_Semanales", "Turnos_Noche_Consecutivos", "Horas_Descanso"]
    X = df[columnas_x]

    # Clasificación multiclase según umbrales normativos de fatiga
    def clasificar_nivel(fila):
        puntaje = (fila["Horas_Semanales"] * 1.2) + (fila["Turnos_Noche_Consecutivos"] * 10) - (fila["Horas_Descanso"] * 1.8)
        if puntaje >= 80 or fila["Horas_Semanales"] >= 55 or (fila["Turnos_Noche_Consecutivos"] >= 4 and fila["Horas_Descanso"] <= 8):
            return "CRÍTICO"
        elif puntaje >= 50 or fila["Horas_Semanales"] >= 48 or fila["Turnos_Noche_Consecutivos"] >= 2:
            return "ALERTA"
        return "NORMAL"

    y = df.apply(clasificar_nivel, axis=1)

    # 3. División Entrenamiento (80% = 800 registros) y Prueba (20% = 200 registros)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # 4. Entrenamiento del modelo RandomForestClassifier
    modelo_rf = RandomForestClassifier(n_estimators=100, random_state=42)
    modelo_rf.fit(X_train, y_train)

    # 5. Predicción sobre el conjunto de prueba (200 registros no vistos)
    y_pred = modelo_rf.predict(X_test)

    # 6. Impresión de Métricas Reproducibles para Evidencia Final 1
    acc = accuracy_score(y_test, y_pred) * 100
    clases = ["NORMAL", "ALERTA", "CRÍTICO"]
    matriz = confusion_matrix(y_test, y_pred, labels=clases)
    importancias = modelo_rf.feature_importances_ * 100

    print("=================================================================")
    print(" EVALUACIÓN DEL MOTOR PREDICTIVO ML - SAFESHIFT PREDICTOR")
    print("=================================================================")
    print(f"Total registros dataset (Ley 19.628) : {len(df)} trabajadores")
    print(f"Conjunto de Entrenamiento (80%)      : {len(X_train)} registros")
    print(f"Conjunto de Prueba / Test (20%)      : {len(X_test)} registros")
    print(f"Exactitud Global (Accuracy)          : {acc:.2f}% (Meta >= 80.00%)")
    print("-----------------------------------------------------------------")
    print("\n1. REPORTE DE CLASIFICACIÓN (PRECISION, RECALL Y F1-SCORE):")
    print(classification_report(y_test, y_pred, labels=clases, digits=4))

    print("-----------------------------------------------------------------")
    print("2. MATRIZ DE CONFUSIÓN (Filas = Real | Columnas = Predicción):")
    df_matriz = pd.DataFrame(
        matriz,
        index=[f"Real: {c}" for c in clases],
        columns=[f"Pred: {c}" for c in clases]
    )
    print(df_matriz)

    print("\n-----------------------------------------------------------------")
    print("3. IMPORTANCIA DE CARACTERÍSTICAS (EXPLICABILIDAD CAJA BLANCA):")
    for nombre, imp in zip(columnas_x, importancias):
        print(f" - {nombre:<28}: {imp:.2f}%")
    print("=================================================================")

    # Guardar modelo actualizado
    joblib.dump(modelo_rf, ruta_pkl)

if __name__ == "__main__":
    evaluar_y_exportar_modelo()