import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiShield, FiLock, FiEye, FiCheckCircle } from 'react-icons/fi';
import { gsap } from 'gsap';

const PrivacyPolicy = () => {
    const navigate = useNavigate();
    const containerRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('.animate-item', {
                y: 20,
                opacity: 0,
                duration: 0.5,
                stagger: 0.1,
                ease: 'power2.out'
            });
        }, containerRef);
        return () => ctx.revert();
    }, []);

    const sections = [
        {
            icon: FiShield,
            title: 'Data Protection',
            content: 'We use industry-standard encryption to protect your personal data and farm information. Your security is our priority.'
        },
        {
            icon: FiLock,
            title: 'Privacy Control',
            content: 'You have full control over your data. We never share your personal information with third parties without your explicit consent.'
        },
        {
            icon: FiEye,
            title: 'Transparency',
            content: 'We are transparent about the data we collect. It is used solely to improve your service experience and farm productivity.'
        }
    ];

    const grooGradient = 'linear-gradient(135deg, #347989 0%, #BB5F36 100%)';
    const grooTextGradient = {
        background: grooGradient,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    };

    return (
        <div ref={containerRef} className="min-h-screen bg-gray-50 pb-10">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-30 border-b border-gray-100">
                <div className="px-4 py-4 flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
                    >
                        <FiArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <span className="text-xl font-black" style={grooTextGradient}>Privacy & Data</span>
                </div>
            </header>

            <main className="px-5 py-6 space-y-6">
                {/* Hero */}
                <div className="animate-item bg-white rounded-[32px] p-8 text-center shadow-sm border border-gray-100">
                    <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiShield className="w-10 h-10 text-teal-600" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 mb-2">Your Privacy Matters</h1>
                    <p className="text-sm text-gray-500 leading-relaxed">
                        At Agroyilt, we are committed to protecting your privacy and ensuring a secure experience.
                    </p>
                </div>

                {/* Policies */}
                <div className="space-y-4">
                    {sections.map((section, idx) => (
                        <div key={idx} className="animate-item bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="p-3 bg-gray-50 rounded-2xl text-teal-600">
                                    <section.icon className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-gray-800">{section.title}</h3>
                            </div>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                {section.content}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Quick Points */}
                <div className="animate-item bg-teal-900 rounded-[32px] p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
                    <h3 className="text-lg font-bold mb-4">Key Principles</h3>
                    <ul className="space-y-3">
                        {['End-to-end encryption', 'Secure payment processing', 'No third-party data selling', 'User-managed permissions'].map((item, i) => (
                            <li key={i} className="flex items-center gap-3 text-sm text-teal-50/80">
                                <FiCheckCircle className="text-emerald-400 shrink-0" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Footer */}
                <div className="animate-item text-center pt-6 opacity-40">
                    <p className="text-[10px] uppercase tracking-widest font-black">Agroyilt Security Standard</p>
                    <p className="text-[10px] mt-1">Last updated: April 17, 2026</p>
                </div>
            </main>
        </div>
    );
};

export default PrivacyPolicy;
