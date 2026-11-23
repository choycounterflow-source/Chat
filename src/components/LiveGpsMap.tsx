import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Layers, LocateFixed, Navigation, Radio } from 'lucide-react';

export interface LiveGpsUserLocation {
  userId: string;
  userName: string;
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  avatar?: string;
  trail?: Array<{ lat: number; lng: number; ts: string }>;
  updatedAt: string;
}

interface LiveGpsMapProps {
  locations: LiveGpsUserLocation[];
  selectedUserId: string | null;
  onSelectUser: (userId: string | null) => void;
  followSelected: boolean;
  onToggleFollow: (next: boolean) => void;
  defaultAvatar: string;
}

function escapeHtml(raw: string): string {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeAvatar(raw: string | undefined, fallback: string): string {
  const clean = typeof raw === 'string' ? raw.trim() : '';
  if (clean && (clean.startsWith('https://') || clean.startsWith('/assets/') || clean.startsWith('data:image/'))) {
    return clean;
  }
  return fallback;
}

function formatTimeAgoShort(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'Just now';
  const sec = Math.floor(ms / 1000);
  if (sec < 8) return 'Live now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const TRAIL_COLORS = [
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#3b82f6', // blue
];

function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return TRAIL_COLORS[Math.abs(hash) % TRAIL_COLORS.length];
}

export const LiveGpsMap: React.FC<LiveGpsMapProps> = ({
  locations,
  selectedUserId,
  onSelectUser,
  followSelected,
  onToggleFollow,
  defaultAvatar,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const trailsRef = useRef<Map<string, L.Polyline>>(new Map());
  const milestonesRef = useRef<Map<string, L.Marker[]>>(new Map());
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const animFramesRef = useRef<Map<string, number>>(new Map());
  const hasFittedInitialRef = useRef(false);

  const [mapLayer, setMapLayer] = useState<'street' | 'satellite'>('street');
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'idle'>('all');

  const isUserActive = React.useCallback((loc: LiveGpsUserLocation) => {
    const ageMs = Date.now() - new Date(loc.updatedAt).getTime();
    const isRecent = Number.isFinite(ageMs) && ageMs <= 180_000;
    const isMoving = loc.speed != null && loc.speed > 0.3;
    return isRecent || isMoving;
  }, []);

  const filteredLocations = useMemo(() => {
    let base = locations;
    if (userFilter === 'active') {
      base = locations.filter((l) => isUserActive(l) || l.userId === selectedUserId);
    } else if (userFilter === 'idle') {
      base = locations.filter((l) => !isUserActive(l) || l.userId === selectedUserId);
    }
    return base;
  }, [locations, userFilter, selectedUserId, isUserActive]);

  const selectedLocation = useMemo(
    () => locations.find((l) => l.userId === selectedUserId) || null,
    [locations, selectedUserId]
  );

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter: [number, number] =
      locations.length > 0 ? [locations[0].lat, locations[0].lng] : [14.5995, 120.9842];

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: locations.length > 0 ? 15 : 6,
      zoomControl: true,
    });

    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    });
    streetLayer.addTo(map);

    mapRef.current = map;
    tileLayerRef.current = streetLayer;

    // Ensure Leaflet measures container accurately inside tabs/cards
    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      window.clearTimeout(resizeTimer);
      animFramesRef.current.forEach((rafId) => window.cancelAnimationFrame(rafId));
      animFramesRef.current.clear();
      markersRef.current.clear();
      trailsRef.current.clear();
      milestonesRef.current.forEach((markers) => markers.forEach((m) => m.remove()));
      milestonesRef.current.clear();
      accuracyCircleRef.current = null;
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      hasFittedInitialRef.current = false;
    };
  }, []);

  // Switch between Street Map & Satellite View
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    const nextLayer =
      mapLayer === 'satellite'
        ? L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            {
              maxZoom: 19,
              attribution: '&copy; Esri World Imagery',
            }
          )
        : L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
          });

    nextLayer.addTo(map);
    tileLayerRef.current = nextLayer;
  }, [mapLayer]);

  // Smoothly update markers, route trails, 3km milestone marks, and follow camera
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const activeIds = new Set(filteredLocations.map((l) => l.userId));

    // Remove stale markers, trails & milestones for users no longer present
    for (const [uid, marker] of markersRef.current.entries()) {
      if (!activeIds.has(uid)) {
        const rafId = animFramesRef.current.get(uid);
        if (rafId) {
          window.cancelAnimationFrame(rafId);
          animFramesRef.current.delete(uid);
        }
        map.removeLayer(marker);
        markersRef.current.delete(uid);
      }
    }
    for (const [uid, poly] of trailsRef.current.entries()) {
      if (!activeIds.has(uid)) {
        map.removeLayer(poly);
        trailsRef.current.delete(uid);
      }
    }
    for (const [uid, msMarkers] of milestonesRef.current.entries()) {
      if (!activeIds.has(uid)) {
        msMarkers.forEach((m) => map.removeLayer(m));
        milestonesRef.current.delete(uid);
      }
    }

    filteredLocations.forEach((loc) => {
      const color = getUserColor(loc.userId);
      const isSelected = loc.userId === selectedUserId;
      const ageMs = Date.now() - new Date(loc.updatedAt).getTime();
      const isFreshLive = Number.isFinite(ageMs) && ageMs <= 90_000;
      const speedKmh = loc.speed != null && loc.speed > 0.4 ? Math.round(loc.speed * 3.6) : 0;
      const safeName = escapeHtml(loc.userName);
      const safeAvatar = escapeHtml(sanitizeAvatar(loc.avatar, defaultAvatar));
      const headingStyle =
        loc.heading != null && Number.isFinite(loc.heading)
          ? `transform: rotate(${Math.round(loc.heading)}deg);`
          : '';

      const iconHtml = `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;pointer-events:auto;">
          <div style="position:relative;width:${isSelected ? 46 : 40}px;height:${isSelected ? 46 : 40}px;display:flex;align-items:center;justify-content:center;">
            ${
              isFreshLive
                ? `<div class="choy-gps-pulse-ring" style="position:absolute;inset:0;border-radius:9999px;background:${color};opacity:0.45;"></div>`
                : ''
            }
            ${
              loc.heading != null && speedKmh > 0
                ? `<div style="position:absolute;inset:-6px;display:flex;align-items:flex-start;justify-content:center;${headingStyle}"><span style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:8px solid ${color};filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6));"></span></div>`
                : ''
            }
            <div style="position:relative;width:${isSelected ? 40 : 34}px;height:${isSelected ? 40 : 34}px;border-radius:9999px;border:3px solid ${isSelected ? '#fbbf24' : color};background:#022c22;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.45);">
              <img src="${safeAvatar}" alt="${safeName}" style="width:100%;height:100%;object-fit:cover;" />
            </div>
          </div>
          <div style="margin-top:2px;padding:2px 7px;border-radius:9999px;background:${isSelected ? '#fbbf24' : '#022c22'};color:${isSelected ? '#020617' : '#ffffff'};border:1px solid ${isSelected ? '#f59e0b' : color};font-size:10px;font-weight:800;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.35);">
            ${safeName}${speedKmh > 0 ? ` · ${speedKmh} km/h` : ''}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'choy-gps-divicon',
        html: iconHtml,
        iconSize: [120, 66],
        iconAnchor: [60, 23],
      });

      const existingMarker = markersRef.current.get(loc.userId);
      const popupHtml = `
        <div style="font-family:system-ui,sans-serif;min-width:170px;">
          <div style="font-weight:800;font-size:13px;color:#022c22;margin-bottom:2px;">${safeName}</div>
          <div style="font-size:11px;color:#065f46;margin-bottom:4px;">
            ${speedKmh > 0 ? `Moving · ${speedKmh} km/h` : formatTimeAgoShort(loc.updatedAt)}
          </div>
          <div style="font-family:monospace;font-size:10px;color:#334155;">
            ${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}
          </div>
          ${
            loc.accuracy != null
              ? `<div style="font-size:10px;color:#475569;">Accuracy: ±${Math.round(loc.accuracy)}m</div>`
              : ''
          }
        </div>
      `;

      if (existingMarker) {
        existingMarker.setIcon(customIcon);
        existingMarker.setZIndexOffset(isSelected ? 1000 : isFreshLive ? 400 : 100);
        existingMarker.setPopupContent(popupHtml);

        const from = existingMarker.getLatLng();
        if (Math.abs(from.lat - loc.lat) > 0.000001 || Math.abs(from.lng - loc.lng) > 0.000001) {
          const prevRaf = animFramesRef.current.get(loc.userId);
          if (prevRaf) window.cancelAnimationFrame(prevRaf);

          const startLat = from.lat;
          const startLng = from.lng;
          const endLat = loc.lat;
          const endLng = loc.lng;
          const durationMs = 850;
          const startTs = performance.now();

          const step = (nowTs: number) => {
            const t = Math.min(1, (nowTs - startTs) / durationMs);
            const eased = 1 - Math.pow(1 - t, 3);
            const curLat = startLat + (endLat - startLat) * eased;
            const curLng = startLng + (endLng - startLng) * eased;
            existingMarker.setLatLng([curLat, curLng]);
            if (t < 1) {
              animFramesRef.current.set(loc.userId, window.requestAnimationFrame(step));
            } else {
              animFramesRef.current.delete(loc.userId);
            }
          };
          animFramesRef.current.set(loc.userId, window.requestAnimationFrame(step));
        }
      } else {
        const marker = L.marker([loc.lat, loc.lng], {
          icon: customIcon,
          zIndexOffset: isSelected ? 1000 : 200,
        }).addTo(map);
        marker.bindPopup(popupHtml);
        marker.on('click', () => {
          onSelectUser(loc.userId);
          onToggleFollow(true);
        });
        markersRef.current.set(loc.userId, marker);
      }

      // Process trail points & place 3km milestone marks to avoid messy overlapping crisscrossing spiderwebs
      const rawTrail =
        loc.trail && loc.trail.length > 0 ? loc.trail : [{ lat: loc.lat, lng: loc.lng, ts: loc.updatedAt }];
      const trailPoints: [number, number][] = [];
      const newMilestones: Array<{ lat: number; lng: number; km: number }> = [];

      let cumulativeDist = 0;
      let lastPoint = rawTrail[0];
      let nextMilestoneKm = 3.0; // 3km milestone interval

      rawTrail.forEach((pt, idx) => {
        if (idx === 0) {
          trailPoints.push([pt.lat, pt.lng]);
        } else {
          const dist = calculateHaversineDistanceKm(lastPoint.lat, lastPoint.lng, pt.lat, pt.lng);
          cumulativeDist += dist;
          // Add point if significant move or final point
          if (dist >= 0.08 || idx === rawTrail.length - 1) {
            trailPoints.push([pt.lat, pt.lng]);
            lastPoint = pt;
          }
          // Check if we hit or passed a 3km milestone
          while (cumulativeDist >= nextMilestoneKm) {
            newMilestones.push({ lat: pt.lat, lng: pt.lng, km: Math.round(nextMilestoneKm) });
            nextMilestoneKm += 3.0; // next marker at 6km, 9km, etc.
          }
        }
      });

      const lastPt = trailPoints[trailPoints.length - 1];
      if (!lastPt || Math.abs(lastPt[0] - loc.lat) > 0.00001 || Math.abs(lastPt[1] - loc.lng) > 0.00001) {
        trailPoints.push([loc.lat, loc.lng]);
      }

      // Draw clean polyline trail
      const existingTrail = trailsRef.current.get(loc.userId);
      if (existingTrail) {
        existingTrail.setLatLngs(trailPoints);
        existingTrail.setStyle({
          color,
          weight: isSelected ? 5 : 3,
          opacity: isSelected ? 0.9 : 0.6,
        });
      } else {
        const poly = L.polyline(trailPoints, {
          color,
          weight: isSelected ? 5 : 3,
          opacity: isSelected ? 0.9 : 0.6,
          dashArray: '6, 6',
        }).addTo(map);
        trailsRef.current.set(loc.userId, poly);
      }

      // Render clean 3km milestone markers
      const oldMsMarkers = milestonesRef.current.get(loc.userId) || [];
      oldMsMarkers.forEach((m) => map.removeLayer(m));

      const createdMsMarkers: L.Marker[] = [];
      newMilestones.forEach((ms) => {
        const msIcon = L.divIcon({
          className: 'choy-gps-milestone-icon',
          html: `<div style="padding:2px 6px;border-radius:9999px;background:#022c22;color:#fbbf24;border:2px solid #f59e0b;font-size:9px;font-weight:900;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.4);">📍 ${ms.km} km</div>`,
          iconSize: [60, 24],
          iconAnchor: [30, 12],
        });
        const msMarker = L.marker([ms.lat, ms.lng], { icon: msIcon, zIndexOffset: 300 }).addTo(map);
        createdMsMarkers.push(msMarker);
      });
      milestonesRef.current.set(loc.userId, createdMsMarkers);
    });

    // Accuracy circle around currently selected user
    if (accuracyCircleRef.current) {
      map.removeLayer(accuracyCircleRef.current);
      accuracyCircleRef.current = null;
    }
    if (selectedLocation) {
      const color = getUserColor(selectedLocation.userId);
      accuracyCircleRef.current = L.circle([selectedLocation.lat, selectedLocation.lng], {
        radius: Math.max(12, Math.min(selectedLocation.accuracy ?? 25, 500)),
        color,
        fillColor: color,
        fillOpacity: 0.12,
        weight: 1.5,
      }).addTo(map);
    }

    // Initial fit-bounds once locations load, or smooth pan when Follow is active
    if (!hasFittedInitialRef.current && locations.length > 0) {
      hasFittedInitialRef.current = true;
      if (locations.length === 1) {
        map.setView([locations[0].lat, locations[0].lng], 16, { animate: true });
      } else {
        const bounds = L.latLngBounds(locations.map((l) => [l.lat, l.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [46, 46], maxZoom: 16 });
      }
    } else if (followSelected && selectedLocation) {
      map.panTo([selectedLocation.lat, selectedLocation.lng], { animate: true, duration: 0.75 });
    }
  }, [filteredLocations, selectedUserId, selectedLocation, followSelected, defaultAvatar, onSelectUser, onToggleFollow]);

  const handleFitAll = () => {
    const map = mapRef.current;
    if (!map || locations.length === 0) return;
    onToggleFollow(false);
    if (locations.length === 1) {
      map.setView([locations[0].lat, locations[0].lng], 16, { animate: true });
    } else {
      const bounds = L.latLngBounds(locations.map((l) => [l.lat, l.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [46, 46], maxZoom: 16, animate: true });
    }
  };

  const handleFocusSelected = () => {
    const map = mapRef.current;
    if (!map || !selectedLocation) return;
    onToggleFollow(true);
    map.setView([selectedLocation.lat, selectedLocation.lng], Math.max(map.getZoom(), 16), { animate: true });
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-emerald-300 dark:border-emerald-700 bg-slate-900 shadow-lg">
      {/* Top Overlay Control Strip */}
      <div className="absolute top-2.5 left-12 right-2.5 z-[400] flex flex-wrap items-center justify-between gap-1.5 pointer-events-none">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/85 border border-emerald-400/50 text-white text-[10px] font-extrabold shadow backdrop-blur-sm">
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span>LIVE MAP RADAR · {filteredLocations.length} / {locations.length} SHOWN</span>
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
          {/* Active / Idle Filter Control */}
          <div className="inline-flex items-center gap-0.5 bg-slate-950/90 border border-emerald-500/40 rounded-xl p-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => setUserFilter('all')}
              className={`px-2 py-0.5 rounded-lg font-bold transition ${
                userFilter === 'all'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-emerald-300 hover:text-white'
              }`}
              title="Show all users"
            >
              All ({locations.length})
            </button>
            <button
              type="button"
              onClick={() => setUserFilter('active')}
              className={`px-2 py-0.5 rounded-lg font-bold transition ${
                userFilter === 'active'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-emerald-300 hover:text-white'
              }`}
              title="Show active users only"
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setUserFilter('idle')}
              className={`px-2 py-0.5 rounded-lg font-bold transition ${
                userFilter === 'idle'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-emerald-300 hover:text-white'
              }`}
              title="Show idle users only"
            >
              Idle
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMapLayer((prev) => (prev === 'street' ? 'satellite' : 'street'))}
            className="px-2.5 py-1 rounded-xl bg-white/95 dark:bg-slate-950/90 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 text-[10px] font-extrabold inline-flex items-center gap-1 shadow hover:bg-emerald-50 transition"
            title="Switch Street / Satellite map view"
          >
            <Layers className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>{mapLayer === 'street' ? 'Satellite' : 'Street Map'}</span>
          </button>

          {locations.length > 0 && (
            <button
              type="button"
              onClick={handleFitAll}
              className="px-2.5 py-1 rounded-xl bg-white/95 dark:bg-slate-950/90 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 text-[10px] font-extrabold inline-flex items-center gap-1 shadow hover:bg-emerald-50 transition"
              title="Zoom map to show all tracked users"
            >
              <Crosshair className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Fit All</span>
            </button>
          )}

          {selectedLocation && (
            <button
              type="button"
              onClick={() => {
                if (followSelected) {
                  onToggleFollow(false);
                } else {
                  handleFocusSelected();
                }
              }}
              className={`px-2.5 py-1 rounded-xl border text-[10px] font-extrabold inline-flex items-center gap-1 shadow transition ${
                followSelected
                  ? 'bg-amber-400 border-amber-300 text-slate-950'
                  : 'bg-white/95 dark:bg-slate-950/90 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100'
              }`}
              title="Lock camera on selected moving user"
            >
              <LocateFixed className="w-3 h-3" />
              <span>{followSelected ? `Following: ${selectedLocation.userName}` : 'Follow Pin'}</span>
            </button>
          )}
        </div>
      </div>
    </div>

      {/* Leaflet Canvas */}
      <div
        ref={containerRef}
        className="choy-leaflet-container w-full h-[380px] sm:h-[460px] z-0"
      />

      {/* Bottom Selected User Live Telemetry Strip */}
      {selectedLocation && (
        <div className="px-3 py-2 bg-slate-950/95 border-t border-emerald-800/80 text-white flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2 min-w-0">
            <Navigation className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-extrabold truncate">{selectedLocation.userName}</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold">
              {selectedLocation.speed != null && selectedLocation.speed > 0.4
                ? `Moving · ${Math.round(selectedLocation.speed * 3.6)} km/h`
                : formatTimeAgoShort(selectedLocation.updatedAt)}
            </span>
          </div>
          <div className="font-mono text-[10px] text-emerald-200/90">
            Lat: {selectedLocation.lat.toFixed(4)}, Lng: {selectedLocation.lng.toFixed(4)}
          </div>
        </div>
      )}
    </div>
  );
};
