import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiStar } from 'react-icons/fi';
import { FaQuoteLeft } from 'react-icons/fa';
import axios from 'axios';
import TranslatedText from '../../../components/TranslatedText';

const TestimonialSection = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                // Using relative path or base URL from env
                const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL || ''}/public/website/reviews`);
                if (res.data.success) {
                    setReviews(res.data.data.filter(r => r.isActive));
                }
            } catch (error) {
                console.error("Error fetching reviews:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReviews();
    }, []);

    if (loading || reviews.length === 0) return null;

    return (
        <section className="py-12 md:py-24 bg-gradient-to-b from-white to-green-50/30 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-8 md:mb-16">
                    <motion.span 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-green-600 font-bold tracking-widest uppercase text-sm"
                    >
                        <TranslatedText>Wall of Love</TranslatedText>
                    </motion.span>
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl font-black text-gray-900 mt-4 mb-6"
                    >
                        <TranslatedText>What Our Users Say</TranslatedText>
                    </motion.h2>
                    <motion.div 
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="h-1.5 w-24 bg-green-600 mx-auto rounded-full"
                    />
                </div>

                <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-x-auto md:overflow-visible pb-12 scrollbar-hide snap-x snap-mandatory px-2">
                    {reviews.map((review, idx) => (
                        <motion.div
                            key={review._id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className="min-w-[85%] sm:min-w-[45%] lg:min-w-0 bg-white p-5 md:p-7 rounded-3xl shadow-xl shadow-green-900/5 border border-green-100 flex flex-col justify-between snap-center"
                        >
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-1 text-yellow-500">
                                        {[...Array(5)].map((_, i) => (
                                            <FiStar 
                                                key={i} 
                                                className={`w-3 h-3 md:w-4 md:h-4 ${i < (review.rating || 5) ? 'fill-current' : 'text-gray-200'}`} 
                                            />
                                        ))}
                                    </div>
                                    <FaQuoteLeft className="text-green-100 w-6 h-6 md:w-8 md:h-8 opacity-40 shrink-0" />
                                </div>
 
                                <p className="text-gray-700 text-sm md:text-base leading-relaxed mb-4 italic min-h-[60px] line-clamp-4">
                                    "{review.comment}"
                                </p>
                            </div>
 
                            <div className="flex items-center gap-3 mt-auto pt-4 border-t border-gray-50">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-green-500/20 shadow-inner bg-green-50 shrink-0">
                                    {review.userImage ? (
                                        <img src={review.userImage} alt={review.userName} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-green-600 font-bold text-lg">
                                            {review.userName?.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-gray-900 leading-none text-sm md:text-base truncate">{review.userName}</h4>
                                    <p className="text-[10px] md:text-xs text-green-600 font-medium italic truncate mt-1">{review.userRole}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default TestimonialSection;
