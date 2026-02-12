
import React, { useRef, useEffect, useState, useMemo, memo } from 'react';
import { WifiOff } from 'lucide-react';
import { Stop } from '../types';

interface MapComponentProps {
  stops: Stop[];
  currentPos?: { lat: number; lng: number } | null;
  height?: string;
  onMapClick?: (lat: number, lng: number) => void;
  dark?: boolean;
  isDriving?: boolean;
}

// Cache persistant pour les tracés routiers
const routeCache = new Map<string, any>();

const MapComponent: React.FC<MapComponentProps> = memo(({ 
  stops, 
  currentPos, 
  height = "200px", 
  onMapClick, 
  dark = false, 
  isDriving = false 
}) => {
  const mapRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const busMarkerRef = useRef<any>(null);
  const [loadError, setLoadError] = useState(false);
  const containerId = useMemo(() => "map-container-" + Math.random().toString(36).substring(2, 9), []);

  // Fonction pour récupérer le tracé réel suivant les routes
  const fetchRoute = async (points: Stop[]) => {
    if (points.length < 2) return null;
    
    const cacheKey = points.map(p => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|');
    if (routeCache.has(cacheKey)) return routeCache.get(cacheKey);

    const coords = points.map(p => `${p.lng},${p.lat}`).join(';');
    
    // Utilisation du serveur de routage OSM Allemand, souvent plus stable que le serveur de démo OSRM standard
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
    
    // Si tous les serveurs échouent, on trace une ligne droite (fallback)
    return {
      type: 'LineString',
      coordinates: points.map(p => [p.lng, p.lat])
    };
  };

  // Initialisation de la carte Leaflet
  useEffect(() => {
    const L = (window as any).L;
    if (!L) {
      setLoadError(true);
      return;
    }

    const mapInstance = L.map(containerId, { 
      zoomControl: false, 
      attributionControl: false,
      dragging: !isDriving,
      touchZoom: !isDriving,
      scrollWheelZoom: !isDriving,
      doubleClickZoom: !isDriving
    });

    const initialCenter: [number, number] = currentPos 
      ? [currentPos.lat, currentPos.lng] 
      : (stops && stops.length > 0) ? [stops[0].lat, stops[0].lng] : [48.8566, 2.3522];
    
    mapInstance.setView(initialCenter, 15);
    mapRef.current = mapInstance;

    const tileUrl = dark 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      
    L.tileLayer(tileUrl, { crossOrigin: true }).addTo(mapInstance);

    markersLayerRef.current = L.layerGroup().addTo(mapInstance);
    routeLayerRef.current = L.layerGroup().addTo(mapInstance);

    if (onMapClick) {
      mapInstance.on('click', (e: any) => onMapClick(e.latlng.lat, e.latlng.lng));
    }

    const resizeObserver = new ResizeObserver(() => {
      mapInstance.invalidateSize();
    });
    const container = document.getElementById(containerId);
    if (container) resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      mapInstance.remove();
    };
  }, [containerId, dark, isDriving]);

  // Mise à jour des éléments visuels (tracé et marqueurs)
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
          const routeColor = dark ? '#3b82f6' : '#2563eb';
          
          // Tracé "Glow" (néon)
          L.geoJSON(geometry, {
            style: { 
              color: routeColor, 
              weight: 14, 
              opacity: 0.15,
              lineCap: 'round',
              lineJoin: 'round'
            }
          }).addTo(routeLayerRef.current);

          // Ligne de route principale
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

      // Marqueurs d'arrêts personnalisés
      stops.forEach((stop, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === stops.length - 1;
        const color = isFirst ? '#10b981' : (isLast ? '#ef4444' : '#3b82f6');
        
        const icon = L.divIcon({
          className: 'custom-stop-icon',
          html: `
            <div style="
              background-color: ${isFirst || isLast ? color : '#fff'}; 
              width: 20px; 
              height: 20px; 
              border-radius: 50%; 
              border: 3px solid ${isFirst || isLast ? '#fff' : color}; 
              box-shadow: 0 0 15px rgba(0,0,0,0.25);
              display: flex;
              align-items: center;
              justify-content: center;
              color: ${isFirst || isLast ? '#fff' : color};
              font-size: 10px;
              font-weight: 900;
              font-family: 'Inter', sans-serif;
            ">${isFirst ? 'A' : isLast ? 'B' : ''}</div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        
        const marker = L.marker([stop.lat, stop.lng], { icon }).addTo(markersLayerRef.current);
        
        // Ajout du popup avec le nom de l'arrêt
        marker.bindPopup(`
          <div style="font-family: 'Inter', sans-serif; text-align: center;">
            <div style="font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">Station</div>
            <div style="font-size: 14px; font-weight: 800; color: #1e293b; letter-spacing: -0.02em;">${stop.name}</div>
          </div>
        `, {
          closeButton: false,
          offset: [0, -10]
        });
      });

      if (!isDriving && stops.length > 0) {
        const bounds = L.latLngBounds(stops.map(s => [s.lat, s.lng]));
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      }
    };

    updateMapUI();
  }, [stops, dark, isDriving]);

  // Gestion de la position en temps réel du véhicule
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
            box-shadow: 0 0 30px rgba(59,130,246,0.9); 
            display:flex; 
            align-items:center; 
            justify-content:center;
          ">
            <div style="
              width:0; 
              height:0; 
              border-left: 10px solid transparent; 
              border-right: 10px solid transparent; 
              border-bottom: 18px solid white;
            "></div>
          </div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });
      busMarkerRef.current = L.marker([currentPos.lat, currentPos.lng], { 
        icon: busIcon,
        zIndexOffset: 1000 
      }).addTo(map);
    }

    if (isDriving) {
      map.panTo([currentPos.lat, currentPos.lng], { animate: true, duration: 1.5 });
    }
  }, [currentPos, isDriving]);

  if (loadError) {
    return (
      <div className="w-full flex flex-col items-center justify-center p-10 bg-slate-50 text-slate-400 text-center" style={{ height }}>
        <WifiOff size={48} className="mb-4 opacity-20" />
        <p className="text-sm font-black uppercase tracking-widest italic">Service Cartographique Hors-ligne</p>
        <p className="text-[10px] opacity-60 max-w-[220px] mt-2 leading-relaxed">Impossible d'établir une connexion avec les serveurs de cartes. Vérifiez votre accès internet.</p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden w-full h-full relative ${dark ? 'bg-[#080b14]' : 'bg-slate-100'}`} style={{ zIndex: 1, height }}>
      <div id={containerId} style={{ height: '100%', width: '100%' }} className="touch-none" />
    </div>
  );
});

export default MapComponent;