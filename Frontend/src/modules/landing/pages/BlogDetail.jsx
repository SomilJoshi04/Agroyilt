import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiCalendar, FiClock, FiTag, FiShare2, FiUser } from 'react-icons/fi';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import TranslatedText from '../../../components/TranslatedText';
import BreadcrumbsSchema from '../../../components/common/BreadcrumbsSchema';

const BlogDetail = () => {
    const { id } = useParams();
    const [blog, setBlog] = useState(null);
    const [loading, setLoading] = useState(true);

    const articleSchema = blog ? {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": blog.title,
        "image": blog.image || "https://agroyilt.com/AgroyiltLogo.png",
        "author": {
            "@type": "Organization",
            "name": "Agroyilt"
        },
        "publisher": {
            "@type": "Organization",
            "name": "Agroyilt",
            "logo": {
                "@type": "ImageObject",
                "url": "https://agroyilt.com/AgroyiltLogo.png"
            }
        },
        "datePublished": blog.createdAt,
        "description": blog.content.substring(0, 160)
    } : null;

    useEffect(() => {
        window.scrollTo(0, 0);
        const fetchBlog = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL || ''}/public/website/blogs`);
                if (res.data.success) {
                    const found = res.data.data.find(b => b._id === id);
                    setBlog(found);
                }
            } catch (error) {
                console.error("Error fetching blog:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchBlog();
    }, [id]);

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div></div>;
    if (!blog) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-center"><h1 className="text-4xl font-bold mb-4">Blog Not Found</h1><Link to="/blogs" className="text-green-600 font-bold underline">Back to Blogs</Link></div></div>;

    return (
        <div className="min-h-screen bg-white">
            <Helmet>
                <title>{`${blog.title} | Agroyilt Blog`}</title>
                <meta name="description" content={blog.content.substring(0, 160)} />
                <link rel="canonical" href={`https://agroyilt.com/blogs/${id}`} />
                {articleSchema && <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>}
            </Helmet>

            <BreadcrumbsSchema items={[
                { name: 'Home', item: '/' },
                { name: 'Blogs', item: '/blogs' },
                { name: blog.title, item: `/blogs/${id}` }
            ]} />

            <Navbar />
            
            {/* Hero Image */}
            <div className="pt-24 h-[60vh] relative min-h-[400px]">
                <img src={blog.image || "https://placehold.jp/1200x800.png"} alt={blog.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-12 left-0 w-full">
                    <div className="max-w-4xl mx-auto px-4">
                        <Link to="/blogs" className="inline-flex items-center gap-2 text-green-400 font-bold mb-6 hover:text-white transition-colors">
                            <FiArrowLeft /> <TranslatedText>Back to Blogs</TranslatedText>
                        </Link>
                        <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-8 drop-shadow-lg">
                            {blog.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-6 text-white font-bold text-sm uppercase tracking-widest">
                            <div className="flex items-center gap-2 bg-green-600/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                                <FiUser className="text-green-400" /> Administrative Team
                            </div>
                            <div className="flex items-center gap-2">
                                <FiCalendar className="text-green-400" /> {new Date(blog.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Container */}
            <article className="max-w-4xl mx-auto px-4 py-24 relative z-10">
                {/* Meta info floating or centered */}
                <div className="flex justify-between items-center mb-12 pb-8 border-b border-gray-100">
                    <div className="flex gap-2">
                        {blog.tags?.map((tag, i) => (
                            <span key={i} className="bg-gray-50 text-gray-500 text-[10px] font-black uppercase px-3 py-1 rounded border border-gray-200">#{tag}</span>
                        ))}
                    </div>
                    <button className="flex items-center gap-2 text-green-600 font-bold border border-green-100 px-4 py-2 rounded-xl hover:bg-green-50 transition-all">
                        <FiShare2 /> Share Activity
                    </button>
                </div>

                {/* Body Text */}
                <div className="prose prose-xl prose-green max-w-none text-gray-700 leading-relaxed font-medium">
                    {blog.content.split('\n').map((para, i) => (
                        <p key={i} className="mb-6">{para}</p>
                    ))}
                </div>

                {/* Footer Section in Article */}
                <footer className="mt-24 p-12 bg-green-900 rounded-[40px] text-white overflow-hidden relative">
                    <div className="relative z-10">
                        <h3 className="text-3xl font-black mb-4">Want more insights?</h3>
                        <p className="text-green-100/70 mb-8 max-w-sm">Stay updated with our latest agricultural news and tips from experts.</p>
                        <Link to="/user/login" className="inline-block px-8 py-4 bg-green-500 text-white font-black rounded-2xl hover:bg-green-400 transition-all shadow-xl shadow-green-950/20">Subscribe Newsletter</Link>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-full bg-green-800/20 translate-x-12 -skew-x-12"></div>
                </footer>
            </article>

            <Footer />
        </div>
    );
};

export default BlogDetail;
