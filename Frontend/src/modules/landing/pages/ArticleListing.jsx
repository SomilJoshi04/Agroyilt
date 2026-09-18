import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiCalendar, FiBookOpen, FiTag } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import TranslatedText from '../../../components/TranslatedText';

const ArticleListing = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        window.scrollTo(0, 0);
        const fetchArticles = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL || ''}/public/website/articles`);
                if (res.data.success) {
                    setArticles(res.data.data.filter(a => a.isActive));
                }
            } catch (error) {
                console.error("Error fetching articles:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchArticles();
    }, []);

    return (
        <div className="min-h-screen bg-white">
            <Navbar />
            
            {/* Header */}
            <div className="pt-32 pb-20 bg-orange-600/5 text-orange-950 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
                    <Link to="/" className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-800 transition-colors mb-8 font-bold text-sm uppercase tracking-widest">
                        <FiArrowLeft /> <TranslatedText>Back to Home</TranslatedText>
                    </Link>
                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-6xl md:text-8xl font-black mb-8 leading-tight"
                    >
                        <TranslatedText>Featured</TranslatedText> <span className="text-orange-600 italic"><TranslatedText>Articles</TranslatedText></span>
                    </motion.h1>
                    <p className="text-xl text-orange-900/70 max-w-3xl mx-auto font-medium mb-12">
                        <TranslatedText>Deep dive into specialized farming techniques, agricultural science, and industry-leading research.</TranslatedText>
                    </p>
                    <div className="h-1.5 w-24 bg-orange-500 mx-auto rounded-full"></div>
                </div>
            </div>

            {/* List */}
            <main className="max-w-7xl mx-auto px-4 py-24 relative z-20">
                {loading ? (
                    <div className="space-y-12">
                        {[1,2,3].map(i => (
                            <div key={i} className="flex flex-col lg:flex-row gap-12 animate-pulse">
                                <div className="lg:w-1/2 h-80 bg-orange-50 rounded-[40px]"></div>
                                <div className="lg:w-1/2 space-y-4 pt-8">
                                    <div className="h-8 w-3/4 bg-orange-50 rounded-lg"></div>
                                    <div className="h-4 w-full bg-orange-50 rounded-lg"></div>
                                    <div className="h-4 w-full bg-orange-50 rounded-lg"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-24">
                        {articles.map((article, idx) => (
                            <motion.div
                                key={article._id}
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className={`flex flex-col lg:flex-row gap-8 lg:gap-16 items-center ${idx % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`}
                            >
                                <div className="lg:w-1/2 w-full">
                                    <div className="relative group overflow-hidden rounded-[40px] shadow-2xl shadow-orange-950/10 border-4 border-white aspect-video md:aspect-[16/10]">
                                        <img src={article.image || "https://placehold.jp/800x600.png"} alt={article.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-orange-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    </div>
                                </div>
                                
                                <div className="lg:w-1/2 w-full space-y-6">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-orange-100 text-orange-700 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border border-orange-200/50 shadow-sm">{article.category}</span>
                                        <span className="text-gray-400 font-bold text-xs uppercase flex items-center gap-1.5 ml-2"><FiCalendar /> {new Date(article.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <h2 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight">
                                        {article.title}
                                    </h2>
                                    <p className="text-gray-500 text-lg leading-relaxed font-medium line-clamp-4">
                                        {article.content}
                                    </p>
                                    <Link 
                                        to={`/articles/${article._id}`} 
                                        className="inline-flex items-center gap-3 text-orange-600 font-black text-lg group hover:gap-5 transition-all"
                                    >
                                        <TranslatedText>Read Full Article</TranslatedText> <FiBookOpen className="text-xl" />
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

export default ArticleListing;
