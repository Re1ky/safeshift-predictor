import sys
import os
import json
import warnings

warnings.filterwarnings("ignore")

def calcular_riesgo(horas_semanales: float, noches_consecutivas: int, horas_descanso: float):
    ruta_modelo = os.path.join(os.path.dirname(__file__), "motor_predictivo_safeshift.pkl")
    riesgo_pct = 15
    nivel = "NORMAL"

    try:
        import joblib
        import pandas as pd

        modelo = joblib.load(ruta_modelo)
        df_entrada = pd.DataFrame([{
            "Horas_Semanales": horas_semanales,
            "Turnos_Noche_Consecutivos": noches_consecutivas,
            "Horas_Descanso": horas_descanso
        }])

        prediccion = modelo.predict(df_entrada)[0]

        if hasattr(modelo, "predict_proba"):
            probabilidades = modelo.predict_proba(df_entrada)[0]
            clases = [str(c).upper() for c in modelo.classes_]
            max_prob = float(max(probabilidades))
            pred_str = str(prediccion).upper()

            if "CRIT" in pred_str or "CRÍT" in pred_str or pred_str == "2" or "ALTO" in pred_str:
                nivel = "CRÍTICO"
                riesgo_pct = max(80, min(99, int(round(max_prob * 100))))
            elif "ALERT" in pred_str or "MEDIO" in pred_str or pred_str == "1":
                nivel = "ALERTA"
                riesgo_pct = max(50, min(79, int(round(max_prob * 100))))
            else:
                nivel = "NORMAL"
                riesgo_pct = max(5, min(49, int(round((1.0 - max_prob) * 100)) if max_prob > 0.5 else int(round(max_prob * 100))))
        else:
            pred_str = str(prediccion).upper()
            if "CRIT" in pred_str or "CRÍT" in pred_str or pred_str == "2":
                nivel, riesgo_pct = "CRÍTICO", 90
            elif "ALERT" in pred_str or "MEDIO" in pred_str or pred_str == "1":
                nivel, riesgo_pct = "ALERTA", 65
            else:
                nivel, riesgo_pct = "NORMAL", 18

    except Exception:
        # Cálculo de respaldo normativo si el entorno Python local no tiene joblib/pandas activo
        puntaje = (horas_semanales * 1.1) + (noches_consecutivas * 9) - (horas_descanso * 1.5)
        riesgo_pct = int(max(5, min(98, round(puntaje))))
        if riesgo_pct >= 80:
            nivel = "CRÍTICO"
        elif riesgo_pct >= 50:
            nivel = "ALERTA"
        else:
            nivel = "NORMAL"

    return {"riesgo": riesgo_pct, "nivel": nivel}

if __name__ == "__main__":
    try:
        horas = float(sys.argv[1]) if len(sys.argv) > 1 else 45.0
        noches = int(float(sys.argv[2])) if len(sys.argv) > 2 else 0
        descanso = float(sys.argv[3]) if len(sys.argv) > 3 else 16.0
        resultado = calcular_riesgo(horas, noches, descanso)
        print(json.dumps(resultado, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"riesgo": 50, "nivel": "ALERTA", "error": str(e)}, ensure_ascii=False))