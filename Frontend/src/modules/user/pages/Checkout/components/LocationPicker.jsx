import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from '@react-google-maps/api';
import { FiCrosshair, FiSearch } from 'react-icons/fi';

export const GOOGLE_MAPS_LIBRARIES = ['places', 'geometry'];

const mapContainerStyle = {
  width: '100%',
  height: '256px'
};

const defaultCenter = {
  lat: 28.6139,
  lng: 77.2090
};

const LocationPicker = ({ onLocationSelect, initialPosition = null }) => {
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(initialPosition || defaultCenter);
  const [loading, setLoading] = useState(false);
  const [autocomplete, setAutocomplete] = useState(null);

  const handleAutocompleteLoad = (autocompleteInstance) => {
    setAutocomplete(autocompleteInstance);
  };

  const handlePlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const newPos = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        setMarker(newPos);
        if (map) {
          map.panTo(newPos);
          map.setZoom(17);
        }
        if (onLocationSelect) {
          onLocationSelect({
            lat: newPos.lat,
            lng: newPos.lng,
            address: place.formatted_address || '',
            components: place.address_components || []
          });
        }
      }
    }
  };

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  // Update marker when initialPosition changes (from external selection)
  useEffect(() => {
    if (initialPosition) {
      setMarker(initialPosition);
      if (map) {
        map.panTo(initialPosition);
        map.setZoom(15);
      }
    }
  }, [initialPosition, map]);

  // Get user's current location on mount
  useEffect(() => {
    if (!initialPosition && navigator.geolocation && isLoaded) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          setMarker(newPos);
          if (map) {
            map.panTo(newPos);
          }
          reverseGeocode(newPos);
        },
        (error) => {
        }
      );
    }
  }, [isLoaded, map]);

  // Reverse geocode to get address from coordinates
  const reverseGeocode = async (position) => {
    if (!window.google) return;

    setLoading(true);
    const geocoder = new window.google.maps.Geocoder();

    geocoder.geocode({ location: position }, (results, status) => {
      setLoading(false);
      if (status === 'OK' && results[0]) {
        if (onLocationSelect) {
          onLocationSelect({
            lat: position.lat,
            lng: position.lng,
            address: results[0].formatted_address,
            components: results[0].address_components
          });
        }
      }
    });
  };

  // Handle map click
  const onMapClick = useCallback((e) => {
    const newPos = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng()
    };
    setMarker(newPos);
    reverseGeocode(newPos);
  }, []);


  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true); // Show loading state on button click
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLoading(false);
          const newPos = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          setMarker(newPos);
          if (map) {
            map.panTo(newPos);
            map.setZoom(17); // Zoom in closer for better accuracy confirmation
          }
          reverseGeocode(newPos);
        },
        (error) => {
          setLoading(false);
          console.error("Geolocation error:", error);
          let errorMessage = 'Unable to get your current location.';
          if (error.code === 1) errorMessage = 'Location permission denied. Please enable location services.';
          else if (error.code === 2) errorMessage = 'Location unavailable. Please check your GPS.';
          else if (error.code === 3) errorMessage = 'Location request timed out.';

          alert(`${errorMessage} Please select manually on the map.`);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  if (loadError) {
    return <div className="h-64 bg-gray-200 flex items-center justify-center">
      <p className="text-red-600">Error loading Google Maps</p>
    </div>;
  }

  if (!isLoaded) {
    return <div className="h-64 bg-gray-200 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
    </div>;
  }

  return (
    <div className="w-full relative shadow-sm rounded-3xl overflow-hidden border border-slate-200">
      <style>{`
        .pac-container {
          z-index: 100000 !important;
        }
      `}</style>
      <div className="relative h-64 bg-slate-100">
        {/* Search Bar Overlay */}
        <div className="absolute top-4 left-4 right-4 z-10">
          <Autocomplete onLoad={handleAutocompleteLoad} onPlaceChanged={handlePlaceChanged}>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search location..."
                className="w-full bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-xl py-2 pl-9 pr-3 font-semibold outline-none text-xs text-slate-800 placeholder:text-slate-400 shadow-md focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              />
            </div>
          </Autocomplete>
        </div>

        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={marker}
          zoom={15}
          onClick={onMapClick}
          onLoad={setMap}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            gestureHandling: 'greedy',
            rotateControl: true,
            tiltControl: true,
            zoomControl: false,
            disableDefaultUI: true // cleans up google logos somewhat
          }}
        >
          {marker && <Marker position={marker} />}
        </GoogleMap>

        {/* Pin Instruction Overlay */}
        <div className="absolute bottom-4 left-4 bg-slate-900/90 text-white px-3 py-1.5 rounded-xl text-[9px] uppercase font-black tracking-widest z-10 shadow-lg backdrop-blur-sm">
          {loading ? 'Fetching address...' : 'Map Pin Location'}
        </div>

        {/* Locate Me Button */}
        <button
          onClick={handleCurrentLocation}
          className="absolute bottom-4 right-4 p-3.5 bg-white rounded-xl shadow-lg flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all z-10 border border-slate-100 text-teal-600"
        >
          <FiCrosshair className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default LocationPicker;
