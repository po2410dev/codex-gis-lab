import './style.css';
import {Map, View} from 'ol';
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

const map = new Map({
  target: 'map',
  layers: [
    osmLayer,
    geoserverLayer
  ],
  view: new View({
    center: [0, 0],
    zoom: 2
  })
});

map.addControl(new ScaleLine());
