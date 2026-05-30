import { MapPin } from 'lucide-react';
import { useState } from 'react';
import Map, { Layer, Marker, NavigationControl, Source } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import Card from '../components/Card';
import { useApp } from '../context/AppContext';

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const COVERAGE_AREAS = [
  { name: 'Oadby',           lat: 52.5985, lng: -1.0811 },
  { name: 'Stoneygate',      lat: 52.6189, lng: -1.1019 },
  { name: 'Knighton',        lat: 52.6062, lng: -1.1100 },
  { name: 'Clarendon Park',  lat: 52.6170, lng: -1.1220 },
  { name: 'Evington',        lat: 52.6178, lng: -1.0736 },
];

const CENTER = { lng: -1.097, lat: 52.608 };

const geojson = {
  type: 'FeatureCollection',
  features: COVERAGE_AREAS.map((area) => ({
    type: 'Feature',
    properties: { name: area.name },
    geometry: { type: 'Point', coordinates: [area.lng, area.lat] },
  })),
};

const circleLayer = {
  id: 'coverage-fill',
  type: 'circle',
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 18, 12, 42, 14, 90],
    'circle-color': '#10B981',
    'circle-opacity': 0.12,
    'circle-stroke-color': '#10B981',
    'circle-stroke-width': 2,
    'circle-stroke-opacity': 0.45,
  },
};

export default function Coverage() {
  const { theme } = useApp();
  const [viewState, setViewState] = useState({
    longitude: CENTER.lng,
    latitude: CENTER.lat,
    zoom: 12.5,
  });

  const mapStyle = theme === 'dark'
    ? 'mapbox://styles/mapbox/dark-v11'
    : 'mapbox://styles/mapbox/light-v11';

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-ink">Coverage area</h1>
        <p className="mt-2 text-muted">
          ErrandBuddy currently operates across five areas in south-east Leicester.
          More areas coming soon.
        </p>
      </div>

      {/* Map */}
      <div className="overflow-hidden rounded-2xl border border-surface-hi shadow-soft" style={{ height: 480 }}>
        {TOKEN ? (
          <Map
            {...viewState}
            onMove={(e) => setViewState(e.viewState)}
            mapboxAccessToken={TOKEN}
            mapStyle={mapStyle}
            style={{ width: '100%', height: '100%' }}
          >
            {/* Shaded coverage circles */}
            <Source id="coverage" type="geojson" data={geojson}>
              <Layer {...circleLayer} />
            </Source>

            {/* Area name labels */}
            {COVERAGE_AREAS.map((area) => (
              <Marker key={area.name} longitude={area.lng} latitude={area.lat} anchor="bottom">
                <div className="flex flex-col items-center">
                  <div className="rounded-full bg-emerald-500 p-1.5 shadow-lift">
                    <MapPin size={14} className="text-white" />
                  </div>
                  <span className="mt-1 rounded-md bg-white/90 px-2 py-0.5 text-xs font-bold text-stone-900 shadow-soft dark:bg-zinc-800/90 dark:text-white">
                    {area.name}
                  </span>
                </div>
              </Marker>
            ))}

            <NavigationControl position="top-right" />
          </Map>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-surface-hi text-center">
            <MapPin size={32} className="text-muted" />
            <p className="font-bold text-ink">Map token not configured</p>
            <p className="max-w-xs text-sm text-muted">
              Add your Mapbox public token as <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs">VITE_MAPBOX_TOKEN</code> in <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs">.env.local</code> to enable the map.
            </p>
          </div>
        )}
      </div>

      {/* Area cards */}
      <div>
        <p className="mb-3 text-sm font-bold text-muted uppercase tracking-widest">Covered areas</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {COVERAGE_AREAS.map((area) => (
            <Card key={area.name} className="flex items-center gap-3 py-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <MapPin size={15} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm font-bold text-ink">{area.name}</span>
            </Card>
          ))}
        </div>
      </div>

      {/* Not covered nudge */}
      <Card className="border-dashed text-center py-8">
        <p className="font-bold text-ink">Not in a covered area?</p>
        <p className="mt-1 text-sm text-muted">We're expanding regularly. Leave your postcode and we'll let you know when we reach you.</p>
        <a href="/contact" className="mt-4 inline-block rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300">
          Get notified
        </a>
      </Card>

    </div>
  );
}
