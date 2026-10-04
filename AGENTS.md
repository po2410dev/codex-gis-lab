# Instrucciones para agentes

## Proyecto
Aplicación GIS de una sola página con JavaScript ES modules, OpenLayers
y Vite, sin backend propio.

- `main.js`: mapa, capas e interacción GIS.
- `index.html`: estructura de la interfaz.
- `style.css`: estilos del mapa y los paneles.
- `package.json`, `package-lock.json` y `vite.config.js`: dependencias y build.

## Alcance
- Limitar los cambios al requerimiento y los ajustes necesarios para cumplirlo.
  Evitar refactorizaciones, cambios visuales y actualizaciones ajenas a la tarea.
- Preservar la funcionalidad GIS existente salvo que se solicite cambiarla.
- No agregar dependencias salvo que el requerimiento las necesite o el usuario
  lo autorice explícitamente. Si cambian, mantener sincronizado el lockfile.
- No editar `dist` ni `node_modules`.

## Consideraciones GIS
- El mapa combina OSM con una capa `ImageWMS` de GeoServer:
  `https://ahocevar.com/geoserver/wms`, capa `topp:states`.
  No sustituir servicios ni tipos de fuente incidentalmente.
- La vista usa EPSG:3857. Respetar las proyecciones y transformar coordenadas
  explícitamente cuando corresponda.
- Generar GetFeatureInfo mediante OpenLayers con la coordenada, resolución
  y proyección de la vista. Preservar el manejo de errores y respuestas
  asíncronas; mostrar atributos externos como texto, sin interpretar HTML.
- OSM y el GeoServer público son servicios externos. Revisar red, respuestas
  y CORS antes de atribuir un fallo al código.

## Verificación
- Después de modificar código, ejecutar `npm run build` como verificación
  automática estándar. Actualmente no hay scripts de tests ni lint.
- Revisar el diff para detectar cambios ajenos al requerimiento.
- Comprobar en navegador los comportamientos afectados y posibles regresiones
  GIS o de interfaz. Un build exitoso no demuestra que el mapa, los servicios
  externos o las interacciones funcionen correctamente.
- Informar por separado las verificaciones automáticas realizadas, las
  comprobaciones manuales realizadas y las que quedaron pendientes.
