import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FiChevronDown, FiSearch } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const SearchableCitySelect = ({ 
  cities = [], 
  value, 
  onChange, 
  defaultLabel, 
  defaultOptionValue = "", 
  placeholder = "Select a city",
  theme = "light" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    } else {
      setSearchTerm("");
    }
  }, [isOpen]);

  const filteredCities = useMemo(() => {
    const lower = searchTerm.trim().toLowerCase();
    return cities.filter(city => city.name.toLowerCase().includes(lower));
  }, [cities, searchTerm]);

  const selectedCityName = useMemo(() => {
    if (value === defaultOptionValue && defaultLabel) return defaultLabel;
    const city = cities.find(c => (c._id || c.id) === value);
    return city ? city.name : placeholder;
  }, [value, cities, defaultLabel, placeholder, defaultOptionValue]);

  const isDark = theme === "dark";

  return (
    <div className="relative w-full sm:min-w-[200px]" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-2 text-left rounded-lg transition-all ${
          isDark 
            ? "bg-slate-700 text-white border border-slate-600 focus:ring-2 focus:ring-slate-500 hover:bg-slate-600" 
            : "bg-white text-gray-900 border border-gray-300 focus:ring-2 focus:ring-blue-500 font-semibold py-3"
        }`}
      >
        <span className={`truncate ${value === defaultOptionValue && isDark ? "font-bold text-yellow-300" : ""}`}>
          {selectedCityName}
        </span>
        <FiChevronDown className={`shrink-0 ml-2 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 w-full mt-2 rounded-xl shadow-xl border overflow-hidden ${
              isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"
            }`}
          >
            <div className={`p-2 border-b flex items-center gap-2 ${isDark ? "border-slate-700" : "border-gray-100"}`}>
              <FiSearch className={`shrink-0 ${isDark ? "text-slate-400" : "text-gray-400"}`} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full bg-transparent focus:outline-none text-sm ${
                  isDark ? "text-white placeholder:text-slate-500" : "text-gray-900 placeholder:text-gray-400"
                }`}
              />
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
              {defaultLabel && (
                <button
                  type="button"
                  onClick={() => { onChange(defaultOptionValue); setIsOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    value === defaultOptionValue
                      ? (isDark ? "bg-slate-700 text-white" : "bg-blue-50 text-blue-700 font-bold")
                      : (isDark ? "text-slate-300 hover:bg-slate-700/50" : "text-gray-700 hover:bg-gray-50")
                  }`}
                >
                  {defaultLabel}
                </button>
              )}
              {filteredCities.length === 0 ? (
                <div className={`px-3 py-4 text-center text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  No cities found
                </div>
              ) : (
                filteredCities.map((city) => {
                  const cityId = city._id || city.id;
                  const isSelected = value === cityId;
                  return (
                    <button
                      key={cityId}
                      type="button"
                      onClick={() => { onChange(cityId); setIsOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        isSelected
                          ? (isDark ? "bg-slate-700 text-white" : "bg-blue-50 text-blue-700 font-bold")
                          : (isDark ? "text-slate-300 hover:bg-slate-700/50" : "text-gray-700 hover:bg-gray-50")
                      }`}
                    >
                      {city.name}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchableCitySelect;
