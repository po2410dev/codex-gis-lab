import './style.css';
import {Map, View} from 'ol';
import Control from 'ol/control/Control';
import ScaleLine from 'ol/control/ScaleLine';
import TileLayer from 'ol/layer/Tile';
import ImageLayer from 'ol/layer/Image';
import OSM from 'ol/source/OSM';
import ImageWMS from 'ol/source/ImageWMS';

const osmLayer = new TileLayer({
  source: new OSM()
});

const geoserverLayer = new ImageLayer({
  source: new ImageWMS({
    url: 'https://ahocevar.com/geoserver/wms',
    params: {
      'LAYERS': 'topp:states'
    },
    serverType: 'geoserver'
  })
});

const initialView = {
  center: [0, 0],
  zoom: 2,
  rotation: 0
};

const map = new Map({
  target: 'map',
  layers: [
    osmLayer,
    geoserverLayer
  ],
  view: new View({...initialView, center: [...initialView.center]})
});

map.addControl(new ScaleLine());

const resetViewButton = document.createElement('button');
resetViewButton.type = 'button';
resetViewButton.textContent = 'Vista inicial';
resetViewButton.title = 'Volver a la vista inicial del mapa';
resetViewButton.setAttribute('aria-label', resetViewButton.title);
resetViewButton.lang = 'es';
resetViewButton.addEventListener('click', () => {
  const view = map.getView();
  view.cancelAnimations();
  view.setCenter([...initialView.center]);
  view.setZoom(initialView.zoom);
  view.setRotation(initialView.rotation);
});

const resetViewControl = document.createElement('div');
resetViewControl.className = 'reset-view ol-unselectable ol-control';
resetViewControl.append(resetViewButton);
map.addControl(new Control({element: resetViewControl}));

const featureInfo = document.getElementById('feature-info-content');
let latestRequest = 0;

for (const [id, layer] of [
  ['osm-visible', osmLayer],
  ['states-visible', geoserverLayer]
]) {
  const checkbox = document.getElementById(id);
  checkbox.checked = layer.getVisible();
  checkbox.addEventListener('change', () => {
    layer.setVisible(checkbox.checked);
  });
  layer.on('change:visible', () => {
    checkbox.checked = layer.getVisible();
  });
}

geoserverLayer.on('change:visible', () => {
  // Invalidar también las consultas pendientes al cambiar la visibilidad.
  ++latestRequest;
  featureInfo.textContent = geoserverLayer.getVisible()
    ? 'Hacé clic sobre un estado para consultar sus datos.'
    : 'Activá la capa Estados para consultar sus datos.';
});

map.on('singleclick', async (event) => {
  const requestId = ++latestRequest;
  if (!geoserverLayer.getVisible()) return;

  const view = map.getView();
  const url = geoserverLayer.getSource().getFeatureInfoUrl(
    event.coordinate,
    view.getResolution(),
    view.getProjection(),
    {'INFO_FORMAT': 'application/json', 'FEATURE_COUNT': 1}
  );

  if (!url) {
    featureInfo.textContent = 'No se pudo generar la consulta para este punto.';
    return;
  }

  featureInfo.textContent = 'Consultando estado…';

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GetFeatureInfo: HTTP ${response.status}`);
    }
    const data = await response.json();
    // Una respuesta anterior no debe reemplazar la del último clic.
    if (requestId !== latestRequest) return;
    if (!Array.isArray(data.features)) {
      throw new Error('Respuesta GetFeatureInfo inválida');
    }
    if (data.features.length === 0) {
      featureInfo.textContent = 'No se encontró un estado en este punto.';
      return;
    }

    const attributes = document.createElement('dl');
    for (const [name, value] of Object.entries(data.features[0].properties ?? {})) {
      const label = document.createElement('dt');
      label.textContent = name;
      const detail = document.createElement('dd');
      detail.textContent = value == null ? 'Sin datos' : String(value);
      attributes.append(label, detail);
    }
    featureInfo.replaceChildren(attributes);
  } catch {
    if (requestId !== latestRequest) return;
    featureInfo.textContent = 'No se pudo obtener la información del estado. Intentá nuevamente.';
  }
});
