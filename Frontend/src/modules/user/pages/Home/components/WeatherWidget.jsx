import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCloud, FiCloudRain, FiSun, FiWind, FiMapPin, FiArrowRight } from 'react-icons/fi';
import { motion } from 'framer-motion';
import weatherService from '../../../services/weatherService';

export default function WeatherWidget() {
    const navigate = useNavigate();
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        const res = await weatherService.getWeather(latitude, longitude);
                        if (res.success) {
                            setWeather(res.data);
                        }
                    } catch (err) {
                        console.error("Weather error:", err);
                    } finally {
                        setLoading(false);
                    }
                },
                () => setLoading(false)
            );
        } else {
            setLoading(false);
        }
    }, []);

    const getWeatherIcon = (description) => {
        const d = description?.toLowerCase() || '';
        if (d.includes('rain')) return <FiCloudRain className="w-8 h-8 text-white drop-shadow-md" />;
        if (d.includes('cloud')) return <FiCloud className="w-8 h-8 text-white drop-shadow-md" />;
        if (d.includes('sun') || d.includes('clear')) return <FiSun className="w-8 h-8 text-white drop-shadow-md" />;
        return <FiCloud className="w-8 h-8 text-white drop-shadow-md" />;
    };

    const displayTemp = weather ? `${Math.round(weather.current.temp)}°C` : (loading ? "..." : "--");
    const displayDesc = weather ? weather.current.description : (loading ? "Loading..." : "Unknown");
    const iconToRender = weather ? getWeatherIcon(weather.current.description) : <FiCloud className="w-8 h-8 text-white drop-shadow-md opacity-50" />;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => navigate('/user/weather')}
            className="relative overflow-hidden bg-white border border-slate-100 rounded-[20px] p-3 shadow-[0_4px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all active:scale-95 group flex items-center gap-3 cursor-pointer"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className={`relative w-[42px] h-[42px] rounded-[14px] flex items-center justify-center flex-shrink-0 bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm border border-indigo-100 group-hover:border-indigo-600 z-10 ${loading ? 'animate-pulse' : ''}`}>
                {/* Adjust icon size slightly for the smaller wrapper */}
                <div className="scale-75 origin-center flex items-center justify-center">
                    {iconToRender}
                </div>
                
                {/* Temperature Badge */}
                {(!loading && weather) && (
                    <div className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm border-2 border-white z-20">
                        {displayTemp}
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0 z-10">
                <p className="text-[13px] sm:text-sm font-black text-slate-800 leading-tight truncate tracking-tight">Weather</p>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate tracking-wide capitalize">{displayDesc}</p>
            </div>
        </motion.div>
    );
}
