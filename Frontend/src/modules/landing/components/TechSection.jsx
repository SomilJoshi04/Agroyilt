import React from 'react';
import { motion } from 'framer-motion';
import { FaReact, FaNodeJs, FaWhatsapp } from 'react-icons/fa';
import { SiFirebase, SiExpress, SiGooglemaps } from 'react-icons/si';
import { WiCloudy } from 'react-icons/wi';
import { HiOutlineBadgeCheck, HiOutlineTrendingUp, HiOutlineMap } from 'react-icons/hi';

const TechSection = () => {
    const techs = [
        { name: "React Frontend", icon: <FaReact className="text-blue-400" />, desc: "Fast & responsive Web UI" },
        { name: "Node.js Backend", icon: <FaNodeJs className="text-green-500" />, desc: "Scalable API services" },
        { name: "Firebase Service", icon: <SiFirebase className="text-yellow-500" />, desc: "Real-time data synchronization" },
        { name: "Weather API", icon: <WiCloudy className="text-gray-400" />, desc: "Smart crop forecasting" },
        { name: "Google Maps", icon: <SiGooglemaps className="text-red-500" />, desc: "GPS & Distance tracking" },
        { name: "WhatsApp Notify", icon: <FaWhatsapp className="text-green-600" />, desc: "Instant booking alerts" }
    ];

    return (
        <section className="py-24 bg-white border-b border-gray-100">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row items-center gap-16">
                    <div className="lg:w-1/2">
                        <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-8 leading-tight">
                            Powered by <span className="text-green-700">Cutting-Edge</span> Technology
                        </h2>
                        <p className="text-lg text-gray-600 leading-relaxed mb-10">
                            We've built AgroYilt using the most reliable and performance-oriented technologies to ensure
                            zero downtime and 100% security for all transactions.
                        </p>
                        <div className="grid grid-cols-2 gap-8">
                            {techs.map((tech, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="flex items-center space-x-3"
                                >
                                    <div className="text-3xl">{tech.icon}</div>
                                    <div>
                                        <p className="font-bold text-gray-900">{tech.name}</p>
                                        <p className="text-xs text-gray-400 uppercase tracking-tighter">{tech.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <div className="lg:w-1/2 relative w-full">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 bg-green-100 rounded-full blur-3xl opacity-30"
                        ></motion.div>

                        {/* Visual Dashboard Mockup Instead of Code */}
                        <div className="relative bg-gray-900 rounded-[2.5rem] p-6 shadow-2xl border border-gray-800 overflow-hidden min-h-[400px]">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-600/20 rounded-full blur-3xl -mr-10 -mt-10"></div>

                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <p className="text-gray-400 text-xs uppercase tracking-widest font-bold">Admin Dashboard</p>
                                    <h4 className="text-white text-xl font-bold">Live Fleet Status</h4>
                                </div>
                                <div className="bg-green-600/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold flex items-center animate-pulse">
                                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                                    LIVE MONITORING
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Dashboard Card 1 */}
                                <motion.div
                                    initial={{ x: 50, opacity: 0 }}
                                    whileInView={{ x: 0, opacity: 1 }}
                                    className="bg-gray-800/50 backdrop-blur-md p-4 rounded-2xl border border-gray-700 flex items-center justify-between"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400">
                                            <HiOutlineMap size={24} />
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm">Active Bookings</p>
                                            <p className="text-gray-400 text-xs">24 Tractors in Field</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-green-400 font-bold">$1,240</p>
                                        <p className="text-gray-500 text-[10px]">CURRENT EARNINGS</p>
                                    </div>
                                </motion.div>

                                {/* Dashboard Card 2 */}
                                <motion.div
                                    initial={{ x: 50, opacity: 0 }}
                                    whileInView={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="bg-gray-800/50 backdrop-blur-md p-4 rounded-2xl border border-gray-700 flex items-center justify-between"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 bg-yellow-600/20 rounded-xl flex items-center justify-center text-yellow-400">
                                            <HiOutlineBadgeCheck size={24} />
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm">Verified Owners</p>
                                            <p className="text-gray-400 text-xs">98% Total Satisfaction</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-yellow-400 font-bold">142</p>
                                        <p className="text-gray-500 text-[10px]">REGISTERED VENDORS</p>
                                    </div>
                                </motion.div>

                                {/* Dashboard Card 3 */}
                                <motion.div
                                    initial={{ x: 50, opacity: 0 }}
                                    whileInView={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="bg-gray-800/50 backdrop-blur-md p-4 rounded-2xl border border-gray-700 flex items-center justify-between"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center text-purple-400">
                                            <HiOutlineTrendingUp size={24} />
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm">Growth Rate</p>
                                            <p className="text-gray-400 text-xs">+15% Monthly Yield</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-purple-400 font-bold">+24%</p>
                                        <p className="text-gray-500 text-[10px]">USER RETENTION</p>
                                    </div>
                                </motion.div>
                            </div>

                            <div className="mt-8 flex justify-center">
                                <div className="flex -space-x-3">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="w-10 h-10 rounded-full border-2 border-gray-900 bg-gray-700 overflow-hidden flex items-center justify-center text-[10px] text-white font-bold uppercase">
                                            {i === 5 ? "+4k" : "User"}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-gray-400 text-xs ml-4 py-2">trusted by 4,000+ farmers across India</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TechSection;
