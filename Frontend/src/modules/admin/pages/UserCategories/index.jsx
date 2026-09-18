import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ensureIds, loadCatalog } from "./utils";
import HomePage from "./pages/HomePage";
import CategoriesPage from "./pages/CategoriesPage";
import ServicesPage from "./pages/ServicesPage";
import BrandsPage from "./pages/BrandsPage";


import SearchableCitySelect from "./components/SearchableCitySelect";
import { cityService } from "../../services/cityService";

const UserCategories = () => {
  const [catalog, setCatalog] = useState(() => ensureIds(loadCatalog()));
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(() => localStorage.getItem('adminSelectedCity') || '');

  useEffect(() => {
    const handler = () => setCatalog(ensureIds(loadCatalog()));
    window.addEventListener("adminUserAppCatalogUpdated", handler);
    return () => window.removeEventListener("adminUserAppCatalogUpdated", handler);
  }, []);

  useEffect(() => {
    if (selectedCity) {
      localStorage.setItem('adminSelectedCity', selectedCity);
    } else {
      localStorage.removeItem('adminSelectedCity');
    }
  }, [selectedCity]);

  // Fetch cities once for the parent container
  useEffect(() => {
    const fetchCities = async () => {
      try {
        let currentCities = cities;
        if (cities.length === 0) {
          const response = await cityService.getAll();
          if (response.success) {
            currentCities = (response.cities || []).filter(city => city.isActive);
            setCities(currentCities);
          }
        }

        // Auto-select default or first city if none selected
        if (!selectedCity && currentCities.length > 0) {
          const defaultCity = currentCities.find(c => c.isDefault);
          // Handle potentially different ID formats
          const cityId = defaultCity
            ? (defaultCity._id || defaultCity.id)
            : (currentCities[0]._id || currentCities[0].id);

          if (cityId) {
            setSelectedCity(cityId);
          }
        }
      } catch (error) {
        console.error('Failed to fetch cities:', error);
      }
    };
    fetchCities();
  }, [selectedCity, cities.length]);

  // Get admin role to control UI visibility
  const isAdminSuper = (() => {
    try {
      const storedData = sessionStorage.getItem('adminData') || localStorage.getItem('adminData');
      const stored = JSON.parse(storedData || '{}');
      return (stored.role || 'admin') === 'super_admin';
    } catch (e) {
      return false;
    }
  })();

  return (
    <div className="space-y-4">
      {/* Global City Filter Header - Visible only to Super Admin */}
      {isAdminSuper && (
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 rounded-xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between text-white border border-slate-700 gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Parameters</h2>
            <p className="text-sm text-slate-300">Filter all catalog content by city</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <label className="text-sm font-medium text-slate-200 whitespace-nowrap">Selected City:</label>
            <SearchableCitySelect 
              cities={cities}
              value={selectedCity}
              onChange={setSelectedCity}
              defaultLabel="Default (All India) - Fallback"
              theme="dark"
            />
          </div>
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <Routes>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<HomePage catalog={catalog} setCatalog={setCatalog} selectedCity={selectedCity} />} />
          <Route path="categories" element={<CategoriesPage catalog={catalog} setCatalog={setCatalog} selectedCity={selectedCity} cities={cities} />} />
          <Route path="sections" element={<ServicesPage catalog={catalog} setCatalog={setCatalog} selectedCity={selectedCity} />} />
          <Route path="brands" element={<BrandsPage catalog={catalog} setCatalog={setCatalog} selectedCity={selectedCity} />} />

          <Route path="*" element={<Navigate to="home" replace />} />
        </Routes>
      </motion.div>
    </div>
  );
};

export default UserCategories;


