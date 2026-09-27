#CODIGO GENERADOR DE DATOS LABORALES

import pandas as pd
import numpy as np

def generar_datos_laborales():
    # Fijar semilla para que los resultados sean reproducibles
    np.random.seed(42)

    n_filas = 1000

    # 1- ID del trabajador y Departamento
    id_trabajador = np.arange(1, n_filas + 1)
    departamentos = np.random.choice(['Operaciones', 'Logística', 'Mantenimiento', 'Ventas', 'Administración'], n_filas)

    # 2- Horas Semanales Acumuladas
    # Supuesto legal: Máximo 45 horas a la semana.
    # El 80% cumple la ley (entre 35 y 45 hrs), el 20% la viola (entre 46 y 65 hrs).
    prob_horas = np.random.choice(['cumple', 'viola'], size=n_filas, p=[0.8, 0.2])
    horas_semanales = np.where(
        prob_horas == 'cumple',
        np.random.randint(30, 46, n_filas),
        np.random.randint(46, 66, n_filas)
    )

    # 3- Turnos de Noche Consecutivos
    # Supuesto legal: Máximo 2 turnos de noche seguidos sin un día libre extra.
    # El 85% cumple, el 15% viola la norma.
    prob_noche = np.random.choice(['cumple', 'viola'], size=n_filas, p=[0.85, 0.15])
    turnos_noche = np.where(
        prob_noche == 'cumple',
        np.random.randint(0, 3, n_filas),
        np.random.randint(3, 8, n_filas)
    )

    # 4- Horas de Descanso entre Turnos
    # Supuesto legal: Mínimo 11 horas de descanso entre el fin de un turno y el inicio de otro.
    # El 90% cumple, el 10% tiene menos descanso del legal.
    prob_descanso = np.random.choice(['cumple', 'viola'], size=n_filas, p=[0.90, 0.10])
    horas_descanso = np.where(
        prob_descanso == 'cumple',
        np.random.randint(11, 25, n_filas),  # Descanso de 11 a 24 horas
        np.random.randint(4, 11, n_filas)    # Descanso deficiente de 4 a 10 horas
    )

    # Construir el DataFrame
    df = pd.DataFrame({
        'ID_Trabajador': id_trabajador,
        'Departamento': departamentos,
        'Horas_Semanales': horas_semanales,
        'Turnos_Noche_Consecutivos': turnos_noche,
        'Horas_Descanso': horas_descanso
    })

    # 5- Evaluar la infracción (Crear columna de estado)
    # Si alguna de las condiciones rompe la ley, el trabajador tiene una violación laboral.
    df['Infraccion_Horas'] = df['Horas_Semanales'] > 45
    df['Infraccion_Nocturna'] = df['Turnos_Noche_Consecutivos'] > 2
    df['Infraccion_Descanso'] = df['Horas_Descanso'] < 11

    # Estado final de cumplimiento
    df['Violacion_Ley_Laboral'] = df['Infraccion_Horas'] | df['Infraccion_Nocturna'] | df['Infraccion_Descanso']

    # Convertir booleanos a texto para mayor claridad en el CSV
    df['Violacion_Ley_Laboral'] = df['Violacion_Ley_Laboral'].map({True: 'Sí (Infracción)', False: 'No (Cumple)'})

    # Guardar en archivo CSV
    nombre_archivo = 'datos_trabajadores.csv'
    df.to_csv(nombre_archivo, index=False, encoding='utf-8')

    # Imprimir un reporte rápido en la consola
    print(f"Archivo '{nombre_archivo}' generado con éxito con {n_filas} registros.\n")
    print("Resumen de Cumplimiento Laboral:")
    print(df['Violacion_Ley_Laboral'].value_counts())
    print("\nPrimeras 5 filas generadas:")
    print(df.head())

if __name__ == '__main__':
    generar_datos_laborales()