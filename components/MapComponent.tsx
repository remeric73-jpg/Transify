
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

// Cache persistant pour les tracés routiers
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

  // Fonction pour récupérer le tracé réel suivant les routes
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
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.code === 'Ok' && data.routes.length > 0) {
            const geometry = data.routes[0].geometry;
            routeCache.set(cacheKey, geometry);
            return geometry;
          }
        }
      } catch (error) {
        console.warn(`Routing error with ${url}:`, error);
      }
    }
    
    return {
      type: 'LineString',
      coordinates: points.map(p => [p.lng, p.lat])
    };
  };

  useEffect(() => {
    const L = (window as any).L;
    if (!L) {
      setLoadError(true);
      return;
    }

    const mapInstance = L.map(containerId, { 
      zoomControl: false, 
      attributionControl: false,
      dragging: true,
      touchZoom: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      tap: true
    });

    const initialCenter: [number, number] = currentPos 
      ? [currentPos.lat, currentPos.lng] 
      : (stops && stops.length > 0) ? [stops[0].lat, stops[0].lng] : [48.8566, 2.3522];
    
    mapInstance.setView(initialCenter, isDriving ? 17 : 15);
    mapRef.current = mapInstance;

    let tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let attribution = '&copy; OpenStreetMap';

    if (satellite) {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = 'Esri &copy; OpenStreetMap';
    } else if (dark) {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      attribution = '&copy; CARTO &copy; OSM';
    }
      
    L.tileLayer(tileUrl, { crossOrigin: true, attribution }).addTo(mapInstance);

    markersLayerRef.current = L.layerGroup().addTo(mapInstance);
    routeLayerRef.current = L.layerGroup().addTo(mapInstance);

    if (onMapClick) {
      mapInstance.on('click', (e: any) => onMapClick(e.latlng.lat, e.latlng.lng));
    }

    // Détecter quand l'utilisateur déplace la carte manuellement pour désactiver le suivi
    mapInstance.on('movestart', (e: any) => {
      if (e.hard) return; // Ignore les déplacements programmés
      if (isDriving) setFollowUser(false);
    });

    const resizeObserver = new ResizeObserver(() => {
      mapInstance.invalidateSize();
    });
    const container = document.getElementById(containerId);
    if (container) resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      mapInstance.remove();
    };
  }, [containerId, dark, satellite, isDriving]);

  // Effet pour gérer le focusLocation
  useEffect(() => {
    const map = mapRef.current;
    if (map && focusLocation) {
      map.setView([focusLocation.lat, focusLocation.lng], 16, { animate: true });
    }
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
          const routeColor = satellite ? '#facc15' : (dark ? '#3b82f6' : '#2563eb');
          L.geoJSON(geometry, {
            style: { 
              color: routeColor, 
              weight: 6, 
              opacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round'
            }
          }).addTo(routeLayerRef.current);
        }
      }

      stops.forEach((stop, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === stops.length - 1;
        const color = isFirst ? '#10b981' : (isLast ? '#ef4444' : (satellite ? '#facc15' : '#3b82f6'));
        
        const icon = L.divIcon({
          className: 'custom-stop-icon',
          html: `
            <div style="
              background-color: ${isFirst || isLast ? color : '#fff'}; 
              width: 20px; 
              height: 20px; 
              border-radius: 50%; 
              border: 3px solid ${isFirst || isLast ? '#fff' : color}; 
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
              display: flex;
              align-items: center;
              justify-content: center;
              color: ${isFirst || isLast ? '#fff' : color};
              font-size: 10px;
              font-weight: 900;
              transform: rotate(${isDriving ? (heading || 0) : 0}deg);
            ">${isFirst ? 'A' : isLast ? 'B' : ''}</div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        
        L.marker([stop.lat, stop.lng], { icon }).addTo(markersLayerRef.current).bindPopup(`<b>${stop.name}</b>`, { closeButton: false, offset: [0, -10] });
      });

      if (!isDriving && stops.length > 0 && !focusLocation) {
        const bounds = L.latLngBounds(stops.map(s => [s.lat, s.lng]));
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      }
    };

    updateMapUI();
  }, [stops, dark, satellite, isDriving, heading]);

  // Gestion de la position du bus en temps réel (Navigation)
  useEffect(() => {
    const map = mapRef.current;
    const L = (window as any).L;
    if (!map || !L || !currentPos) return;

    if (busMarkerRef.current) {
      busMarkerRef.current.setLatLng([currentPos.lat, currentPos.lng]);
    } else {
      const busIcon = L.divIcon({
        className: 'bus-marker-icon',
        html: `
          <div style="
            background-color: #3b82f6; 
            width: 38px; 
            height: 38px; 
            border-radius: 50%; 
            border: 4px solid white; 
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
            display:flex; 
            align-items:center; 
            justify-content:center;
            transform: rotate(${isDriving ? (heading || 0) : 0}deg);
          ">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
              <path d="M4 16c0 1.1.9 2 2 2h1v1c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-1h6v1c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-1h1c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v8zM6 8h12v4H6V8z"/>
            </svg>
          </div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });
      busMarkerRef.current = L.marker([currentPos.lat, currentPos.lng], { 
        icon: busIcon,
        zIndexOffset: 1000 
      }).addTo(map);
    }

    if (isDriving && followUser) {
      map.setView([currentPos.lat, currentPos.lng], 17, { animate: true });
    }
  }, [currentPos, isDriving, followUser, heading]);

  // Orientation de la carte (Rotation CSS)
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (isDriving && heading !== null) {
      // On applique la rotation inverse au conteneur de la carte pour simuler l'orientation "Ahead Up"
      // On scale pour éviter les bords blancs lors de la rotation
      container.style.transition = 'transform 0.5s ease-out';
      container.style.transform = `rotate(${-heading}deg) scale(1.6)`;
    } else {
      container.style.transform = `rotate(0deg) scale(1)`;
    }
  }, [isDriving, heading, containerId]);

  if (loadError) {
    return (
      <div className="w-full flex flex-col items-center justify-center p-10 bg-slate-50 text-slate-400 text-center" style={{ height }}>
        <WifiOff size={40} className="mb-4 opacity-20" />
        <p className="text-sm font-black uppercase tracking-widest italic">Carte Indisponible</p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden w-full h-full relative ${satellite ? 'bg-[#1a1c21]' : (dark ? 'bg-[#080b14]' : 'bg-slate-100')}`} style={{ zIndex: 1, height }}>
      {/* Wrapper pour masquer les débords de rotation */}
      <div className="w-full h-full overflow-hidden absolute inset-0">
        <div id={containerId} style={{ height: '100%', width: '100%' }} />
      </div>
      
      {/* Bouton de recentrage en mode navigation */}
      {isDriving && !followUser && (
        <button 
          onClick={() => setFollowUser(true)}
          className="absolute bottom-6 right-6 z-[1000] bg-blue-600 text-white p-4 rounded-full shadow-2xl active:scale-90 transition-transform flex items-center gap-2 border-2 border-white"
        >
          <Navigation size={20} className="rotate-45" />
          <span className="text-xs font-black uppercase italic">Recentrer</span>
        </button>
      )}
    </div>
  );
});

export default MapComponent;
