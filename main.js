import './style.css';
import {Map, View} from 'ol';
import Control from 'ol/control/Control';
import ScaleLine from 'ol/control/ScaleLine';
import TileLayer from 'ol/layer/Tile';
import ImageLayer from 'ol/layer/Image';
import OSM from 'ol/source/OSM';
import ImageWMS from 'ol/source/ImageWMS';
import GeoJSON from 'ol/format/GeoJSON';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {Fill, Stroke, Style} from 'ol/style';

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

const selectionSource = new VectorSource();
const selectionFormat = new GeoJSON();
const selectionLayer = new VectorLayer({
  source: selectionSource,
  style: new Style({
    stroke: new Stroke({color: '#ff6600', width: 3}),
    fill: new Fill({color: 'rgba(255, 102, 0, 0.2)'})
  })
});

const map = new Map({
  target: 'map',
  layers: [
    osmLayer,
    geoserverLayer,
    selectionLayer
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
  selectionSource.clear();
  featureInfo.textContent = geoserverLayer.getVisible()
    ? 'Hacé clic sobre un estado para consultar sus datos.'
    : 'Activá la capa Estados para consultar sus datos.';
});

map.on('singleclick', async (event) => {
  const requestId = ++latestRequest;
  selectionSource.clear();
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

    try {
      // Leer el CRS de la colección; sin CRS, GeoJSON usa EPSG:4326.
      const dataProjection = selectionFormat.readProjection(data);
      if (!dataProjection) throw new Error('Proyección GeoJSON desconocida');
      const selectedFeature = selectionFormat.readFeature(data.features[0], {
        dataProjection,
        featureProjection: view.getProjection()
      });
      const geometry = selectedFeature.getGeometry();
      if (!geometry || !['Polygon', 'MultiPolygon'].includes(geometry.getType()) ||
          !geometry.getFlatCoordinates().every(Number.isFinite) ||
          !geometry.getExtent().every(Number.isFinite) || geometry.getArea() <= 0) {
        throw new Error('Geometría del estado inválida');
      }
      selectionSource.addFeature(selectedFeature);
    } catch {
      const notice = document.createElement('p');
      notice.textContent = 'Se obtuvieron los atributos, pero no se pudo resaltar la geometría del estado.';
      featureInfo.append(notice);
    }
  } catch {
    if (requestId !== latestRequest) return;
    featureInfo.textContent = 'No se pudo obtener la información del estado. Intentá nuevamente.';
  }
});
