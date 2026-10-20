# Pruebas funcionales — Comercial Nova

## Resultados automatizados

| Comprobación | Resultado |
|---|---|
| Pruebas frontend Node | APROBADO |
| Pruebas backend pytest | APROBADO |
| Compilación React | NO_VERIFICADO |
| Servidor React HTTP | NO_DISPONIBLE |
| Salud de la API HTTP | APROBADO |
| Ejecución real K-Means HTTP | APROBADO |

## Diez pruebas funcionales obligatorias

Estas pruebas requieren verificación de interacción 
en el navegador. No se marcarán aprobadas 
sin haberlas realizado.

| N.º | Prueba | Entrada | Resultado esperado | Estado |
|---|---|---|---|---|
| 1 | Registrar cliente | Nuevo cliente con campos válidos | El registro aparece en la tabla | Pendiente de validación visual |
| 2 | Código duplicado | Repetir código C001 | El sistema impide guardar | Pendiente de validación visual |
| 3 | Valor negativo | Gasto acumulado de -10 | El sistema muestra validación | Pendiente de validación visual |
| 4 | Editar cliente | Cambiar visitas de C001 | El registro y los indicadores se actualizan | Pendiente de validación visual |
| 5 | Buscar cliente | Buscar por nombre o código | Se muestran los registros coincidentes | Pendiente de validación visual |
| 6 | Cancelar eliminación | Seleccionar eliminar y cancelar | El cliente permanece registrado | Pendiente de validación visual |
| 7 | Ejecutar K=3 | Usar 12 clientes | Se generan tres grupos y estadísticas | Pendiente de validación visual |
| 8 | K mayor a registros | Usar K=5 con tres registros | Se bloquea el procesamiento | Pendiente de validación visual |
| 9 | Estados de error | API desconectada o datos vacíos | Se muestra mensaje comprensible | Pendiente de validación visual |
| 10 | Persistencia | Modificar registro y recargar | El cambio permanece en localStorage | Pendiente de validación visual |

## Evidencias de ejecución

Directorio: `evidencias\validacion-20261020_095300`

Se almacenan registros de:

- Pruebas automatizadas del frontend.
- Pruebas automatizadas de la API.
- Compilación de producción.
- Comprobación HTTP de React y Python.
- Respuesta real de K-Means, si estuvo disponible.

## Capturas pendientes

- Panel principal con los cuatro indicadores.
- Tabla de clientes con los registros iniciales.
- Formulario con sus validaciones.
- Segmentación realizada con K=3.
- Distribución gráfica y estadísticas.
- Filtrado y ordenamiento por segmento.
- Recomendaciones comerciales y acciones.

## Observación

El funcionamiento del algoritmo y de los servicios
no demuestra por sí solo que toda la interfaz
haya superado las pruebas manuales.
