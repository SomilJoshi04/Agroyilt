import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiArrowLeft, FiSmartphone, FiUsers, FiSmile } from 'react-icons/fi';
import { gsap } from 'gsap';
import Logo from '../../../../components/common/Logo';
import api from '../../../../services/api';

const HowToUse = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const guideType = searchParams.get('type'); // 'video' or 'image'

  const containerRef = useRef(null);
  const [guideContent, setGuideContent] = useState(null);
  const [fullScreenMedia, setFullScreenMedia] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch App Guide content from API
    api.get('/content/app-guide')
      .then(res => {
        if (res.data?.success && res.data?.data) {
          setGuideContent(res.data.data);
        }
      })
      .catch(err => console.error("Failed to fetch app guide content", err))
      .finally(() => setLoading(false));

    // Simple entrance animation
    const ctx = gsap.context(() => {
      gsap.from('.animate-item', {
        y: 20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power2.out'
      });
    }, containerRef);

    return () => ctx.revert();
  }, [guideType]);

  // Filter questions based on type
  const filteredQuestions = useMemo(() => {
    if (!guideContent?.questions) return [];
    if (!guideType) return guideContent.questions;
    
    return guideContent.questions.filter(q => {
      if (!q.media || q.media.length === 0) return false;
      return q.media.some(m => m.type === guideType);
    }).map(q => ({
      ...q,
      media: q.media.filter(m => m.type === guideType)
    }));
  }, [guideContent, guideType]);

  // Gradient Definition
  const grooGradient = 'linear-gradient(135deg, #347989 0%, #BB5F36 100%)';
  const grooTextGradient = {
    background: grooGradient,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-50 pb-10">
      {/* Fullscreen Media Modal */}
      {fullScreenMedia && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <button 
            onClick={() => setFullScreenMedia(null)}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white/70 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          
          <div className="relative w-full max-w-5xl max-h-[85vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {fullScreenMedia.type === 'video' ? (
              <video 
                src={fullScreenMedia.url} 
                controls 
                autoPlay
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              />
            ) : (
              <img 
                src={fullScreenMedia.url} 
                alt="Fullscreen media" 
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" 
              />
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-30 border-b border-gray-100">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => window.history.state && window.history.state.idx > 0 ? navigate(-1) : navigate('/user')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
          >
            <FiArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <span className="text-xl font-bold" style={grooTextGradient}>App Guide</span>
        </div>
      </header>

      <main className="px-5 py-6 space-y-8">
        {/* Hero Section */}
        <div className="animate-item text-center">
          <div className="relative w-28 h-28 mx-auto mb-6">
            <div
              className="absolute inset-[-3px] rounded-full opacity-70"
              style={{
                background: 'conic-gradient(from 0deg, #347989, #D68F35, #BB5F36, #347989)',
                animation: 'spin 4s linear infinite',
              }}
            />
            <div className="absolute inset-0 bg-white rounded-full shadow-lg flex items-center justify-center">
              <Logo className="w-16 h-16 object-contain" />
            </div>
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            How to use <span style={grooTextGradient}>Agroyilt</span>
          </h1>
          <p className="text-gray-500 max-w-xs mx-auto leading-relaxed">
            Follow these simple steps to make the most of our application.
          </p>
        </div>

        {/* Dynamic Guide Content from Backend */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-[#347989] rounded-full animate-spin"></div>
          </div>
        ) : filteredQuestions && filteredQuestions.length > 0 ? (
          <div className="animate-item space-y-6">
            {filteredQuestions.map((q, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#347989]/5 to-[#BB5F36]/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
                
                <div className="flex flex-col gap-5 items-start w-full">
                  
                  {/* Number & Text Wrapper */}
                  <div className="flex gap-4 items-start flex-1 min-w-0 w-full">
                    {/* Step Number */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#347989] to-[#BB5F36] flex items-center justify-center shrink-0 text-white font-bold shadow-md shadow-primary-500/20 mt-0.5">
                      {idx + 1}
                    </div>
                    
                    {/* Text Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-800 mb-1.5">{q.question}</h3>
                      <div 
                        className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: q.answer.replace(/\n/g, '<br/>') }}
                      />
                    </div>
                  </div>

                  {/* Media Content */}
                  {q.media && q.media.length > 0 && (
                    <div className="w-full flex flex-wrap justify-center gap-4 pt-2">
                      {q.media.map((m, mIdx) => (
                        <div 
                          key={mIdx} 
                          onClick={() => {
                            if (m.type === 'pdf') {
                              window.open(m.url, '_blank');
                            } else {
                              setFullScreenMedia(m);
                            }
                          }}
                          className="cursor-pointer w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white flex items-center justify-center group-hover:shadow-md transition-all hover:-translate-y-1 hover:shadow-lg shrink-0 relative"
                        >
                          {m.type === 'video' ? (
                            <>
                              <video 
                                src={m.url} 
                                className="w-full h-full object-cover"
                                preload="metadata"
                              />
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center transition-colors hover:bg-black/40">
                                <div className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-[#BB5F36] shadow-lg pl-1">
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                                </div>
                              </div>
                            </>
                          ) : m.type === 'pdf' ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                              <span className="font-bold mt-2 text-sm">View PDF</span>
                            </div>
                          ) : (
                            <img 
                              src={m.url} 
                              alt={`Step ${idx + 1} media ${mIdx + 1}`} 
                              className="w-full h-full object-cover" 
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Fallback How It Works */
          <div className="animate-item">
            <h3 className="text-lg font-bold text-gray-800 mb-4 px-1">How We Work</h3>
            <div className="bg-white rounded-2xl p-1 shadow-sm border border-gray-100">
              {[
                { title: 'Book Details', desc: 'Select service & schedule time', icon: FiSmartphone },
                { title: 'Get Matched', desc: 'We assign a top-rated pro', icon: FiUsers },
                { title: 'Relax', desc: 'Enjoy high-quality service', icon: FiSmile },
              ].map((step, i) => (
                <div key={i} className="flex items-center p-4 border-b last:border-0 border-gray-50 relative">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 mr-4 shadow-sm text-white font-bold text-lg relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#347989] to-[#BB5F36]" />
                    <span className="relative z-10">{i + 1}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">{step.title}</h4>
                    <p className="text-xs text-gray-500">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default HowToUse;
