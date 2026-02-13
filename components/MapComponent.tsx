
import React, { useRef, useEffect, useState, useMemo, memo } from 'react';
import { WifiOff, Navigation } from 'lucide-react';
import { Stop } from '../types';

interface MapComponentProps {
  stops: Stop[];
  currentPos?: { lat: number; lng: number } | null;
  heading?: number | null;
  focusLocation?: { lat: number; lng: number } | null;
  height?: string;
  onMapClick?: (lat: number, lng: number) => void;
  dark?: boolean;
  satellite?: boolean;
  isDriving?: boolean;
}

const routeCache = new Map<string, any>();

const MapComponent: React.FC<MapComponentProps> = memo(({ 
  stops, 
  currentPos, 
  heading = 0,
  focusLocation,
  height = "200px", 
  onMapClick, 
  dark = false, 
  satellite = false,
  isDriving = false 
}) => {
  const mapRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const busMarkerRef = useRef<any>(null);
  const [loadError, setLoadError] = useState(false);
  const [followUser, setFollowUser] = useState(true);
  const containerId = useMemo(() => "map-container-" + Math.random().toString(36).substring(2, 9), []);

  const fetchRoute = async (points: Stop[]) => {
    if (points.length < 2) return null;
    const cacheKey = points.map(p => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|');
    if (routeCache.has(cacheKey)) return routeCache.get(cacheKey);
    const coords = points.map(p => `${p.lng},${p.lat}`).join(';');
    const routingUrls = [
      `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coords}?overview=full&geometries=geojson`,
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
    ];
    for (const url of routingUrls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.code === 'Ok' && data.routes.length > 0) {
            const geometry = data.routes[0].geometry;
            routeCache.set(cacheKey, geometry);
            return geometry;
          }
        }
      } catch (error) { console.warn(error); }
    }
    return { type: 'LineString', coordinates: points.map(p => [p.lng, p.lat]) };
  };

  useEffect(() => {
    const L = (window as any).L;
    if (!L) { setLoadError(true); return; }
    const mapInstance = L.map(containerId, { 
      zoomControl: false, 
      attributionControl: false,
      inertia: false
    });
    const initialCenter: [number, number] = currentPos ? [currentPos.lat, currentPos.lng] : (stops && stops.length > 0) ? [stops[0].lat, stops[0].lng] : [48.8566, 2.3522];
    mapInstance.setView(initialCenter, isDriving ? 17 : 15);
    mapRef.current = mapInstance;

    let tileUrl = satellite ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' : (dark ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
    L.tileLayer(tileUrl, { crossOrigin: true }).addTo(mapInstance);
    markersLayerRef.current = L.layerGroup().addTo(mapInstance);
    routeLayerRef.current = L.layerGroup().addTo(mapInstance);

    if (onMapClick) mapInstance.on('click', (e: any) => onMapClick(e.latlng.lat, e.latlng.lng));

    const stopFollowing = () => { if (isDriving) setFollowUser(false); };
    mapInstance.on('dragstart', stopFollowing);
    mapInstance.on('zoomstart', stopFollowing);

    const resizeObserver = new ResizeObserver(() => mapInstance.invalidateSize());
    const container = document.getElementById(containerId);
    if (container) resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      mapInstance.off('dragstart', stopFollowing);
      mapInstance.off('zoomstart', stopFollowing);
      mapInstance.remove();
    };
  }, [containerId, dark, satellite, isDriving]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && focusLocation) map.setView([focusLocation.lat, focusLocation.lng], 16, { animate: true });
  }, [focusLocation]);

  useEffect(() => {
    const map = mapRef.current;
    const L = (window as any).L;
    if (!map || !L) return;
    const updateMapUI = async () => {
      markersLayerRef.current.clearLayers();
      routeLayerRef.current.clearLayers();
      if (stops.length >= 2) {
        const geometry = await fetchRoute(stops);
        if (geometry) {
          L.geoJSON(geometry, { style: { color: satellite ? '#facc15' : (dark ? '#3b82f6' : '#2563eb'), weight: 6, opacity: 0.8 } }).addTo(routeLayerRef.current);
        }
      }
      stops.forEach((stop, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === stops.length - 1;
        const icon = L.divIcon({
          className: 'custom-stop',
          html: `<div style="background:${isFirst ? '#10b981' : isLast ? '#ef4444' : '#fff'}; width:20px; height:20px; border-radius:50%; border:3px solid ${isFirst || isLast ? '#fff' : '#3b82f6'}; display:flex; align-items:center; justify-content:center; color:${isFirst || isLast ? '#fff' : '#3b82f6'}; font-size:10px; font-weight:900;">${isFirst ? 'A' : isLast ? 'B' : ''}</div>`,
          iconSize: [20, 20], iconAnchor: [10, 10]
        });
        L.marker([stop.lat, stop.lng], { icon }).addTo(markersLayerRef.current);
      });
      if (!isDriving && stops.length > 0 && !focusLocation) {
        map.fitBounds(L.latLngBounds(stops.map(s => [s.lat, s.lng])), { padding: [50, 50], maxZoom: 16 });
      }
    };
    updateMapUI();
  }, [stops, dark, satellite, isDriving]);

  useEffect(() => {
    const map = mapRef.current;
    const L = (window as any).L;
    if (!map || !L || !currentPos) return;
    if (busMarkerRef.current) busMarkerRef.current.setLatLng([currentPos.lat, currentPos.lng]);
    else {
      const busIcon = L.divIcon({
        className: 'bus-icon',
        html: `<div style="background:#3b82f6; width:36px; height:36px; border-radius:50%; border:4px solid white; display:flex; align-items:center; justify-content:center; transform:rotate(${heading || 0}deg);"><svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M4 16c0 1.1.9 2 2 2h1v1c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-1h6v1c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-1h1c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v8zM6 8h12v4H6V8z"/></svg></div>`,
        iconSize: [36, 36], iconAnchor: [18, 18]
      });
      // Fix: Used 'icon: busIcon' instead of the shorthand 'icon' which was not defined in this scope.
      busMarkerRef.current = L.marker([currentPos.lat, currentPos.lng], { icon: busIcon, zIndexOffset: 1000 }).addTo(map);
    }
    if (isDriving && followUser) map.setView([currentPos.lat, currentPos.lng], map.getZoom(), { animate: false });
  }, [currentPos, isDriving, followUser, heading]);

  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (isDriving && heading !== null) {
      container.style.transition = 'transform 0.4s ease-out';
      container.style.transform = `rotate(${-heading}deg) scale(1.6)`;
    } else { container.style.transform = 'none'; }
  }, [isDriving, heading, containerId]);

  if (loadError) return <div className="w-full flex items-center justify-center p-10 bg-slate-50 text-slate-400" style={{ height }}><WifiOff size={40} /></div>;

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ height }}>
      <div id={containerId} style={{ height: '100%', width: '100%' }} />
      {isDriving && !followUser && (
        <button onClick={() => setFollowUser(true)} className="absolute bottom-6 right-6 z-[1000] bg-blue-600 text-white p-4 rounded-full shadow-2xl flex items-center gap-2 border-2 border-white uppercase font-black text-[10px] italic"><Navigation size={18} className="rotate-45" /> Recentrer</button>
      )}
    </div>
  );
});

export default MapComponent;
