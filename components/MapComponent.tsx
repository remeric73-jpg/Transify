
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
  onRouteInfo?: (info: { distance: number; duration: number }) => void;
  dark?: boolean;
  satellite?: boolean;
  isDriving?: boolean;
  hideRoute?: boolean;
  showStaticRouteOnly?: boolean;
}

const routeCache = new Map<string, any>();

const MapComponent: React.FC<MapComponentProps> = memo(({ 
  stops, 
  currentPos, 
  heading = 0,
  focusLocation,
  height = "200px", 
  onMapClick,
  onRouteInfo,
  dark = false, 
  satellite = false,
  isDriving = false,
  hideRoute = false,
  showStaticRouteOnly = false
}) => {
  const mapRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const busMarkerRef = useRef<any>(null);
  const [loadError, setLoadError] = useState(false);
  const [followUser, setFollowUser] = useState(true);
  const containerId = useMemo(() => "map-container-" + Math.random().toString(36).substring(2, 9), []);

  const fetchRoute = async (points: {lat: number, lng: number}[]) => {
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
            const distance = data.routes[0].distance; 
            const duration = data.routes[0].duration; 
            const result = { geometry, distance, duration };
            routeCache.set(cacheKey, result);
            return result;
          }
        }
      } catch (error) { console.warn(error); }
    }
    return { 
      geometry: { type: 'LineString', coordinates: points.map(p => [p.lng, p.lat]) },
      distance: 0,
      duration: 0
    };
  };

  // Initialisation stable de la carte
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

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstance && mapInstance.invalidateSize) {
        mapInstance.invalidateSize();
      }
    });
    const container = document.getElementById(containerId);
    if (container) resizeObserver.observe(container);

    const handleBeforePrint = () => {
      if (mapInstance && stops.length > 0) {
        mapInstance.invalidateSize();
        const boundsPoints = stops.map(s => [s.lat, s.lng]);
        const bounds = L.latLngBounds(boundsPoints);
        mapInstance.fitBounds(bounds, { padding: [40, 40], animate: false });
      }
    };
    window.addEventListener('beforeprint', handleBeforePrint);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('beforeprint', handleBeforePrint);
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
      
      const routePoints = (currentPos && !showStaticRouteOnly) ? [{lat: currentPos.lat, lng: currentPos.lng}, ...stops] : stops;

      if (!hideRoute && routePoints.length >= 2) {
        const routeData = await fetchRoute(routePoints);
        if (routeData) {
          L.geoJSON(routeData.geometry, { 
            style: { 
              color: satellite ? '#facc15' : (dark ? '#3b82f6' : '#2563eb'), 
              weight: 6, 
              opacity: 0.8 
            } 
          }).addTo(routeLayerRef.current);
          if (onRouteInfo) {
            onRouteInfo({ distance: routeData.distance, duration: routeData.duration });
          }
        }
      } else if (hideRoute && onRouteInfo && routePoints.length >= 2) {
         const dist = getSimpleDistance(routePoints[0].lat, routePoints[0].lng, routePoints[1].lat, routePoints[1].lng);
         onRouteInfo({ distance: dist, duration: dist / 11 }); 
      }
      
      stops.forEach((stop, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === stops.length - 1;
        const icon = L.divIcon({
          className: 'custom-stop',
          html: `<div style="background:${isFirst ? '#10b981' : isLast ? '#ef4444' : '#fff'}; width:26px; height:26px; border-radius:50%; border:3px solid ${isFirst || isLast ? '#fff' : '#2563eb'}; display:flex; align-items:center; justify-content:center; color:${isFirst || isLast ? '#fff' : '#2563eb'}; font-size:12px; font-weight:900; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${idx + 1}</div>`,
          iconSize: [26, 26], iconAnchor: [13, 13]
        });
        const marker = L.marker([stop.lat, stop.lng], { icon }).addTo(markersLayerRef.current);
        
        if (!isDriving) {
          marker.bindTooltip(stop.name, {
            permanent: true,
            direction: 'top',
            offset: [0, -15],
            className: 'stop-label-bubble'
          });
        }
      });

      // BUG FIX: Ne pas recadrer automatiquement si on est en train de cliquer sur la carte (édition/création)
      if (!isDriving && stops.length > 0 && !focusLocation && !onMapClick) {
        const boundsPoints = stops.map(s => [s.lat, s.lng]);
        const bounds = L.latLngBounds(boundsPoints);
        
        setTimeout(() => {
          if (map && map.fitBounds) {
            map.fitBounds(bounds, { 
              padding: [50, 50],
              maxZoom: 16,
              animate: true
            });
          }
        }, 100);
      }
    };
    updateMapUI();
  }, [stops, currentPos, dark, satellite, isDriving, hideRoute, showStaticRouteOnly, onMapClick]);

  const getSimpleDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  useEffect(() => {
    const map = mapRef.current;
    const L = (window as any).L;
    if (!map || !L || !currentPos) return;
    
    const navIconHtml = `
      <div style="transform: rotate(${heading || 0}deg); transition: transform 0.2s ease-out; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="16" fill="white" fill-opacity="0.9"/>
          <path d="M20 6L28 30L20 25L12 30L20 6Z" fill="#2563eb"/>
          <path d="M20 6V25L12 30L20 6Z" fill="#1d4ed8"/>
        </svg>
      </div>
    `;

    if (busMarkerRef.current) {
      busMarkerRef.current.setLatLng([currentPos.lat, currentPos.lng]);
      busMarkerRef.current.setIcon(L.divIcon({
        className: 'nav-pointer',
        html: navIconHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      }));
    } else {
      const navIcon = L.divIcon({
        className: 'nav-pointer',
        html: navIconHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });
      busMarkerRef.current = L.marker([currentPos.lat, currentPos.lng], { icon: navIcon, zIndexOffset: 1000 }).addTo(map);
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
    <div className="w-full h-full relative overflow-hidden print:overflow-visible" style={{ height }}>
      <style>{`
        .leaflet-tooltip.stop-label-bubble {
          background: white !important;
          border: 2px solid #2563eb !important;
          border-radius: 8px !important;
          padding: 4px 8px !important;
          font-weight: 800 !important;
          font-size: 10px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
          color: #1e40af !important;
        }
        @media print {
          .leaflet-tooltip { display: none !important; }
          .custom-stop div { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-shadow: none !important; border: 2px solid #000 !important; color: #000 !important; }
          .leaflet-container { height: 100% !important; width: 100% !important; }
        }
      `}</style>
      <div id={containerId} style={{ height: '100%', width: '100%' }} />
      {isDriving && !followUser && (
        <button onClick={() => setFollowUser(true)} className="absolute bottom-6 right-6 z-[1000] bg-blue-600 text-white p-4 rounded-full shadow-2xl flex items-center gap-2 border-2 border-white uppercase font-black text-[10px] italic"><Navigation size={18} className="rotate-45" /> Recentrer</button>
      )}
    </div>
  );
});

export default MapComponent;
