import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FiArrowLeft, FiX, FiSearch, FiMapPin, FiHome } from 'react-icons/fi';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { themeColors } from '../../../../../theme';
import LocationPicker, { GOOGLE_MAPS_LIBRARIES } from './LocationPicker';

const AddressSelectionModal = ({ isOpen, onClose, address = '', houseNumber = '', onHouseNumberChange, onSave }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapAddress, setMapAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [autocomplete, setAutocomplete] = useState(null);

  // Use SAME id + SAME library array reference as LocationPicker → singleton loader, no conflict
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Lock body scroll when modal open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setIsClosing(false);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 250);
  };

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    setMapAddress(location.address);
    setSearchQuery(location.address);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          address: place.formatted_address,
          components: place.address_components,
        };
        setSelectedLocation(location);
        setMapAddress(place.formatted_address);
        setSearchQuery(place.formatted_address);
      }
    }
  };

  const onAutocompleteLoad = (autocompleteInstance) => {
    setAutocomplete(autocompleteInstance);
  };

  // Don't render if closed and not animating
  if (!isOpen && !isClosing) return null;

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        animation: isClosing
          ? 'modalSlideDown 0.25s ease-in forwards'
          : 'modalSlideUp 0.25s ease-out forwards',
      }}
    >
      <style>{`
        @keyframes modalSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes modalSlideDown {
          from { transform: translateY(0);    opacity: 1; }
          to   { transform: translateY(100%); opacity: 0; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#fff',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '50%',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <FiArrowLeft size={18} color="#111" />
          </button>
          <span style={{ fontWeight: 700, fontSize: 17, color: '#111' }}>Set Location on Map</span>
        </div>
        <button
          type="button"
          onClick={handleClose}
          style={{
            background: '#f3f4f6',
            border: 'none',
            borderRadius: '50%',
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <FiX size={18} color="#111" />
        </button>
      </div>

      {/* ── Scrollable Content ── */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

        {/* Info banner */}
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{
            background: `${themeColors.brand.teal}12`,
            border: `1px solid ${themeColors.brand.teal}30`,
            borderRadius: 12,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            marginBottom: 12,
          }}>
            <FiMapPin size={16} color={themeColors.button} style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: themeColors.button }}>Set Your Service Location</div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                Tap on the map or search for an address to pin your location.
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div style={{ padding: '0 16px 8px' }}>
          <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            {/* LocationPicker uses the same useJsApiLoader singleton — no conflict */}
            <LocationPicker
              onLocationSelect={handleLocationSelect}
              initialPosition={selectedLocation}
            />
          </div>
        </div>

        {/* Search + House Number + Save */}
        <div style={{ padding: '0 16px' }}>

          {/* Address Search */}
          <label style={{
            display: 'block', fontSize: 10, fontWeight: 800, color: '#9ca3af',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, marginLeft: 2,
          }}>
            Search Address
          </label>
          {isLoaded ? (
            <Autocomplete
              onLoad={onAutocompleteLoad}
              onPlaceChanged={onPlaceChanged}
              options={{
                componentRestrictions: { country: 'in' },
                fields: ['formatted_address', 'geometry', 'name', 'address_components'],
              }}
            >
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <FiSearch size={15} color="#9ca3af" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
                <input
                  type="text"
                  placeholder="Search for area, street, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 36px 12px 36px',
                    background: '#f9fafb', border: '1px solid #e5e7eb',
                    borderRadius: 12, fontSize: 14, fontWeight: 500,
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <FiX size={14} color="#9ca3af" />
                  </button>
                )}
              </div>
            </Autocomplete>
          ) : (
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <FiSearch size={15} color="#9ca3af" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text" placeholder="Loading map search..." disabled
                style={{ width: '100%', padding: '12px 12px 12px 36px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
          )}

          {/* House/Flat Number */}
          <label style={{
            display: 'block', fontSize: 10, fontWeight: 800, color: '#9ca3af',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, marginLeft: 2,
          }}>
            House / Flat / Office No. (Optional)
          </label>
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <FiHome size={15} color="#9ca3af" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
            <input
              type="text"
              placeholder="e.g. Flat 101, Block A"
              value={houseNumber}
              onChange={(e) => onHouseNumberChange(e.target.value)}
              style={{
                width: '100%', padding: '12px 12px 12px 36px',
                background: '#f9fafb', border: '1px solid #e5e7eb',
                borderRadius: 12, fontSize: 14, fontWeight: 500,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Selected address preview */}
          {mapAddress ? (
            <div style={{
              background: `${themeColors.brand.teal}0D`,
              border: `1px solid ${themeColors.brand.teal}30`,
              borderRadius: 12, padding: '10px 14px', marginBottom: 16,
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <FiMapPin size={14} color={themeColors.button} style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#333', lineHeight: 1.5 }}>{mapAddress}</span>
            </div>
          ) : null}

          {/* Save Button */}
          <button
            type="button"
            onClick={() => onSave(houseNumber, selectedLocation)}
            disabled={!mapAddress}
            style={{
              width: '100%', padding: '15px', borderRadius: 14,
              background: mapAddress ? themeColors.button : '#d1d5db',
              color: '#fff', fontWeight: 800, fontSize: 13,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              border: 'none', cursor: mapAddress ? 'pointer' : 'not-allowed',
              boxShadow: mapAddress ? `0 6px 18px ${themeColors.button}40` : 'none',
              marginBottom: 40, transition: 'all 0.2s',
            }}
          >
            {mapAddress ? '✓ Confirm & Save Location' : 'Pin a Location on Map First'}
          </button>
        </div>
      </div>
    </div>
  );

  // Portal → renders directly on document.body, bypasses any parent CSS stacking
  return ReactDOM.createPortal(modalContent, document.body);
};

export default AddressSelectionModal;
