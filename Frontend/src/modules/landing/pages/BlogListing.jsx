import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiCalendar, FiClock, FiTag } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import TranslatedText from '../../../components/TranslatedText';

const BlogListing = () => {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        window.scrollTo(0, 0);
        const fetchBlogs = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL || ''}/public/website/blogs`);
                if (res.data.success) {
                    setBlogs(res.data.data.filter(b => b.isActive));
                }
            } catch (error) {
                console.error("Error fetching blogs:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchBlogs();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            
            {/* Header */}
            <div className="pt-32 pb-20 bg-green-900 text-white relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <Link to="/" className="inline-flex items-center gap-2 text-green-300 hover:text-white transition-colors mb-8 font-bold">
                        <FiArrowLeft /> <TranslatedText>Back to Home</TranslatedText>
                    </Link>
                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-7xl font-black mb-6"
                    >
                        <TranslatedText>Our</TranslatedText> <span className="text-green-400 text-outline"><TranslatedText>Journal</TranslatedText></span>
                    </motion.h1>
                    <p className="text-xl text-green-100/80 max-w-2xl font-medium">
                        <TranslatedText>Insights, stories, and the latest news from the world of organic farming and modern agriculture.</TranslatedText>
                    </p>
                </div>
                <div className="absolute top-0 right-0 w-1/3 h-full bg-green-800/20 skew-x-12 translate-x-1/2"></div>
            </div>

            {/* List */}
            <main className="max-w-7xl mx-auto px-4 -mt-10 pb-24 relative z-20">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1,2,3,4,5,6].map(i => (
                            <div key={i} className="bg-white rounded-3xl h-96 animate-pulse shadow-sm"></div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {blogs.map((blog, idx) => (
                            <motion.div
                                key={blog._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="group bg-white rounded-3xl overflow-hidden shadow-xl shadow-green-900/5 hover:shadow-2xl hover:shadow-green-900/10 transition-all border border-gray-100 flex flex-col"
                            >
                                <div className="h-64 overflow-hidden relative">
                                    <img src={blog.image || "https://placehold.jp/600x400.png"} alt={blog.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                                        {blog.tags?.slice(0, 2).map((tag, i) => (
                                            <span key={i} className="bg-green-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">#{tag}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-8 flex flex-col flex-1">
                                    <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                                        <span className="flex items-center gap-1.5"><FiCalendar className="text-green-500" /> {new Date(blog.createdAt).toLocaleDateString()}</span>
                                        <span className="flex items-center gap-1.5"><FiClock className="text-green-500" /> 5 min read</span>
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-900 mb-4 group-hover:text-green-600 transition-colors line-clamp-2 leading-tight">
                                        {blog.title}
                                    </h2>
                                    <p className="text-gray-500 line-clamp-3 mb-8 text-sm leading-relaxed flex-1">
                                        {blog.content}
                                    </p>
                                    <Link 
                                        to={`/blogs/${blog._id}`} 
                                        className="inline-flex items-center justify-center w-full py-4 bg-gray-50 text-green-700 font-bold rounded-2xl group-hover:bg-green-600 group-hover:text-white transition-all shadow-sm"
                                    >
                                        <TranslatedText>Read Full Article</TranslatedText>
                                    </Link>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
};

export default BlogListing;
