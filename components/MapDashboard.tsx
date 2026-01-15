
import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { User } from '../types';
import L from 'leaflet';
import { Map as MapIcon, Satellite, UserCheck, LogOut, Navigation, AlertCircle } from 'lucide-react';

// Fix Leaflet Default Icon issue in React
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

const checkInIcon = createCustomIcon('#10B981'); // Emerald-500
const checkOutIcon = createCustomIcon('#64748B'); // Slate-500
const pendingIcon = createCustomIcon('#F59E0B'); // Amber-500

interface MapDashboardProps {
  users: User[];
}

const SetBoundsRect = ({ bounds }: { bounds: L.LatLngBoundsExpression }) => {
  const map = useMap();
  React.useEffect(() => {
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [bounds, map]);
  return null;
};

export const MapDashboard: React.FC<MapDashboardProps> = ({ users }) => {
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');

  // Filter users with valid location data
  const usersWithLocation = useMemo(() => {
    console.log("Processing users for map:", users.length);
    return users.filter(u => {
      // Robust check for string content
      const loc = u.location;
      if (!loc || typeof loc !== 'string') return false;
      // Must contain comma and have reasonable length (e.g. "1,1")
      return loc.includes(',') && loc.trim().length > 3; 
    }).map(u => {
      try {
        const parts = u.location!.split(',').map(p => p.trim());
        if (parts.length < 2) return { ...u, lat: NaN, lng: NaN };

        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        
        // Basic validation for lat/lng range
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return { ...u, lat: NaN, lng: NaN };
        }

        return { ...u, lat, lng };
      } catch (e) {
        console.error("Error parsing location for user", u.id, e);
        return { ...u, lat: NaN, lng: NaN };
      }
    }).filter(u => !isNaN(u.lat) && !isNaN(u.lng));
  }, [users]);

  // Calculate center or bounds
  const bounds = useMemo(() => {
    if (usersWithLocation.length === 0) return null;
    const lats = usersWithLocation.map(u => u.lat);
    const lngs = usersWithLocation.map(u => u.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    // Add small buffer if points are identical
    if (minLat === maxLat && minLng === maxLng) {
        return [
            [minLat - 0.01, minLng - 0.01],
            [maxLat + 0.01, maxLng + 0.01]
        ] as L.LatLngBoundsExpression;
    }

    return [
      [minLat, minLng],
      [maxLat, maxLng]
    ] as L.LatLngBoundsExpression;
  }, [usersWithLocation]);

  // Default Center (Bangkok) if no data
  const defaultCenter: [number, number] = [13.7563, 100.5018];

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden h-[600px] flex flex-col animate-fade-in relative">
      {/* Header / Controls */}
      <div className="absolute top-4 right-4 z-[400] flex gap-2">
        <div className="bg-white/90 backdrop-blur-md p-1 rounded-xl shadow-lg border border-slate-200 flex">
            <button 
                onClick={() => setMapType('street')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${mapType === 'street' ? 'bg-violet-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
                <MapIcon className="w-4 h-4" /> แผนที่
            </button>
            <button 
                onClick={() => setMapType('satellite')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${mapType === 'satellite' ? 'bg-violet-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
                <Satellite className="w-4 h-4" /> ดาวเทียม
            </button>
        </div>
      </div>

      <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg border border-slate-200 pointer-events-none">
         <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-violet-500" /> พิกัดการลงทะเบียน
         </h3>
         <div className="flex flex-col gap-1 mt-1">
             <p className="text-xs text-slate-500">
                ผู้เข้าร่วมทั้งหมด: <span className="font-bold">{users.length}</span>
             </p>
             <p className="text-xs text-slate-500">
                มีพิกัด GPS: <span className={`font-bold ${usersWithLocation.length > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{usersWithLocation.length}</span>
             </p>
         </div>
      </div>

      {usersWithLocation.length === 0 && (
        <div className="absolute inset-0 z-[300] flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 backdrop-blur-md px-6 py-4 rounded-3xl shadow-xl border border-slate-200 flex flex-col items-center">
                <AlertCircle className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-slate-500 font-bold text-sm">ไม่พบข้อมูลพิกัด GPS</p>
                <p className="text-xs text-slate-400 mt-1">ข้อมูลจะปรากฏเมื่อมีการสแกนพร้อมเปิดระบุตำแหน่ง</p>
            </div>
        </div>
      )}

      {/* Map Container */}
      <MapContainer 
        center={defaultCenter} 
        zoom={10} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
      >
        {mapType === 'street' ? (
             <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
        ) : (
            <TileLayer
                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
        )}

        {usersWithLocation.map((user) => (
            <Marker 
                key={user.id} 
                position={[user.lat, user.lng]} 
                icon={user.status === 'checked-in' ? checkInIcon : (user.status === 'checked-out' ? checkOutIcon : pendingIcon)}
            >
                <Popup className="custom-popup">
                    <div className="p-1">
                        <div className="font-bold text-slate-800 mb-1">{user.name}</div>
                        <div className="text-xs text-slate-500 font-mono mb-2">{user.studentId}</div>
                        <div className={`text-[10px] font-bold px-2 py-1 rounded-full w-fit mb-2 ${
                            user.status === 'checked-in' ? 'bg-emerald-100 text-emerald-600' : 
                            user.status === 'checked-out' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-600'
                        }`}>
                            {user.status === 'checked-in' ? 'Check-In' : user.status === 'checked-out' ? 'Check-Out' : 'Pending'}
                        </div>
                        <div className="mt-1 text-[10px] text-slate-400">
                             เวลา: {user.status === 'checked-in' ? user.checkInTime : (user.checkOutTime || '-')}
                        </div>
                         <div className="mt-1 text-[9px] text-slate-300 truncate max-w-[150px]">
                             Coords: {user.lat.toFixed(5)}, {user.lng.toFixed(5)}
                        </div>
                    </div>
                </Popup>
            </Marker>
        ))}

        {bounds && <SetBoundsRect bounds={bounds} />}
      </MapContainer>
    </div>
  );
};
