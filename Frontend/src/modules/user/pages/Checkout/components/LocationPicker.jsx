import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { FiCrosshair, FiSearch } from 'react-icons/fi';
import L from 'leaflet';

// Fix for default marker icon in react-leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { toastManager } from '../../../../../utils/toastManager';


let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const defaultCenter = {
  lat: 28.6139,
  lng: 77.2090
};

// Component to handle map clicks
const MapEvents = ({ setMarker, reverseGeocode }) => {
  useMapEvents({
    click(e) {
      const newPos = {
        lat: e.latlng.lat,
        lng: e.latlng.lng
      };
      setMarker(newPos);
      reverseGeocode(newPos);
    },
  });
  return null;
};

// Component to handle programmatic panning
const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo([center.lat, center.lng], 15);
    }
  }, [center, map]);
  return null;
};

const LocationPicker = ({ onLocationSelect, initialPosition = null }) => {
  const [marker, setMarker] = useState(initialPosition || defaultCenter);
  const [loading, setLoading] = useState(false);

  // Update marker when initialPosition changes (from external selection)
  useEffect(() => {
    if (initialPosition) {
      setMarker(initialPosition);
    }
  }, [initialPosition]);

  // Get user's current location on mount
  useEffect(() => {
    if (!initialPosition && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          setMarker(newPos);
          reverseGeocode(newPos);
        },
        (error) => {}
      );
    }
  }, []);

  // Reverse geocode using Nominatim (OpenStreetMap)
  const reverseGeocode = async (position) => {
    setLoading(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}&addressdetails=1`);
      const data = await response.json();
      
      setLoading(false);
      if (data && data.address) {
        if (onLocationSelect) {
          // Map OSM address structure to our expected structure if needed
          const components = Object.keys(data.address).map(key => ({
            long_name: data.address[key],
            short_name: data.address[key],
            types: [key] // e.g. 'city', 'state', 'postcode'
          }));

          // Translate OSM types to expected Google-like types for compatibility
          const mappedComponents = components.map(c => {
             if(c.types.includes('postcode')) c.types.push('postal_code');
             if(c.types.includes('city') || c.types.includes('town') || c.types.includes('county')) c.types.push('locality');
             if(c.types.includes('state')) c.types.push('administrative_area_level_1');
             return c;
          });

          onLocationSelect({
            lat: position.lat,
            lng: position.lng,
            address: data.display_name,
            components: mappedComponents
          });
        }
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      setLoading(false);
    }
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLoading(false);
          const newPos = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          setMarker(newPos);
          reverseGeocode(newPos);
        },
        (error) => {
          setLoading(false);
          console.error("Geolocation error:", error);
          let errorMessage = 'Unable to get your current location.';
          if (error.code === 1) errorMessage = 'Location permission denied. Please enable location services.';
          else if (error.code === 2) errorMessage = 'Location unavailable. Please check your GPS.';
          else if (error.code === 3) errorMessage = 'Location request timed out.';

          toastManager.error(`${errorMessage} Please select manually on the map.`);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      toastManager.error('Geolocation is not supported by your browser.');
    }
  };

  return (
    <div className="w-full relative shadow-sm rounded-3xl overflow-hidden border border-slate-200">
      <div className="relative h-64 bg-slate-100">
        <MapContainer 
          center={[marker.lat, marker.lng]} 
          zoom={15} 
          style={{ width: '100%', height: '100%', zIndex: 0 }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[marker.lat, marker.lng]} />
          <MapEvents setMarker={setMarker} reverseGeocode={reverseGeocode} />
          <MapUpdater center={marker} />
        </MapContainer>

        {/* Pin Instruction Overlay */}
        <div className="absolute bottom-4 left-4 bg-slate-900/90 text-white px-3 py-1.5 rounded-xl text-[9px] uppercase font-black tracking-widest z-10 shadow-lg backdrop-blur-sm" style={{ zIndex: 1000 }}>
          {loading ? 'Fetching address...' : 'Map Pin Location'}
        </div>

        {/* Locate Me Button */}
        <button
          onClick={handleCurrentLocation}
          style={{ zIndex: 1000 }}
          className="absolute bottom-4 right-4 p-3.5 bg-white rounded-xl shadow-lg flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all border border-slate-100 text-teal-600"
        >
          <FiCrosshair className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default LocationPicker;
