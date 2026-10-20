# Informe técnico — Comercial Nova

## 1. Problema identificado

Las empresas pueden disponer de registros
de clientes sin aprovechar sus diferencias
de frecuencia de visitas y consumo.

Una campaña general puede no responder
por igual a todos los perfiles comerciales.

## 2. Objetivo general

Desarrollar un sistema web modular que
permita gestionar clientes y segmentarlos
mediante aprendizaje no supervisado,
para apoyar la toma de decisiones comerciales.

## 3. Objetivos específicos

- Registrar y validar información de clientes.
- Visualizar indicadores comerciales.
- Preparar datos numéricos para Machine Learning.
- Ejecutar K-Means con K configurable entre 2 y 5.
- Mostrar estadísticas de los grupos obtenidos.
- Filtrar y ordenar resultados.
- Proponer recomendaciones comerciales orientativas.
- Registrar pruebas y evidencias del funcionamiento.

## 4. Datos utilizados

La práctica incluye 12 clientes de prueba,
identificados desde C001 hasta C012.

Cada registro contiene:

- Código del cliente.
- Nombre del cliente.
- Gasto acumulado.
- Visitas en seis meses.
- Antigüedad en meses.

Las tres últimas variables se utilizan
como características del modelo.

## 5. Preparación de información

La gestión de clientes valida campos
obligatorios, duplicados y números negativos.

Antes de ejecutar K-Means se comprueba
que el número de registros sea suficiente.

Además, se requieren al menos K perfiles
numéricos diferentes para evitar grupos vacíos.

## 6. Estandarización

Se utiliza StandardScaler de scikit-learn.

Esta operación permite equilibrar las
variables que originalmente están medidas
en soles, número de visitas y meses.

Sin esta transformación, los valores de
gasto podrían dominar la distancia.

## 7. K-Means

K-Means es un algoritmo de aprendizaje
no supervisado.

Agrupa registros según su similitud
numérica y actualiza los centroides
a lo largo de diferentes iteraciones.

Configuración implementada:

- K: entre 2 y 5.
- Semilla: random_state=42.
- Inicializaciones: n_init=10.
- Límite de iteraciones: max_iter=300.

Etapas del procesamiento:

1. Recibir clientes y valor K.
2. Validar datos.
3. Construir la matriz de características.
4. Estandarizar las tres variables.
5. Ejecutar K-Means.
6. Asignar el número de grupo a cada cliente.
7. Calcular promedios y tamaños de grupos.
8. Devolver los resultados a React.

## 8. Resultados

Cada ejecución devuelve:

- Número K utilizado.
- Segmento asignado a cada cliente.
- Cantidad de clientes por segmento.
- Gasto promedio del segmento.
- Visitas promedio.
- Antigüedad promedio.
- Centroides.
- Inercia y número de iteraciones.
- Fecha de ejecución.

El procesamiento real se realiza
en Python, no mediante grupos
simulados en el frontend.

## 9. Interpretación de segmentos

Un identificador como Grupo 0 o Grupo 1
no representa automáticamente una
categoría comercial.

El perfil del grupo debe determinarse
analizando los valores obtenidos.

Por esta razón, el sistema compara
los promedios del segmento con
los promedios generales.

## 10. Recomendaciones comerciales

El módulo Recomendaciones utiliza una
regla descriptiva para comparar grupos.

Se consideran diferencias de al menos
15 % como superiores o inferiores
al promedio general.

Según el perfil detectado, se proponen
estrategias como:

- Fidelización de clientes activos.
- Reactivación de baja participación.
- Promoción de productos complementarios.
- Incremento de recurrencia.
- Seguimiento de clientes recientes.

Estas propuestas son orientativas.
No demuestran causalidad ni garantizan
ventas adicionales.

## 11. Arquitectura de software

React y TypeScript implementan la
interfaz y gestionan su estado.

FastAPI expone el servicio HTTP.
NumPy y scikit-learn realizan el
procesamiento numérico.

La interfaz consume la API, valida
la respuesta y presenta estadísticas.

La persistencia se realiza en
localStorage para esta práctica.

## 12. Calidad y validación

Se emplean pruebas automatizadas
con Node.js y pytest.

También se verifica el funcionamiento
HTTP de los servidores y se realiza
una compilación de producción.

Las pruebas visuales y de interacción
deben completarse manualmente.

Los resultados detallados se encuentran
en `docs/PRUEBAS.md` y `evidencias`.

## 13. Aspectos pendientes de verificar

- Completar las diez pruebas funcionales
  directamente en el navegador.
- Adjuntar capturas de las pantallas.
- Verificar la visualización de errores.
- Comprobar la adaptación móvil.
- Verificar el registro del tiempo
  de ejecución del algoritmo, requerido
  por la práctica y todavía no confirmado.

## 14. Conclusión

Comercial Nova integra una aplicación
web modular con un algoritmo real de
aprendizaje no supervisado.

La solución permite estudiar el
comportamiento de clientes, comparar
grupos y formular estrategias
comerciales fundamentadas en datos.

La entrega definitiva requiere
evidencias de interacción y el cierre
de los requisitos pendientes.
