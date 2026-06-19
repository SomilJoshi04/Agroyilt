import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiSearch, FiChevronRight, FiHelpCircle, FiBook, FiAlertCircle
} from 'react-icons/fi';
import api from '../../../../services/api';

const FAQ = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const faqRes = await api.get('/content/faq').catch(() => null);

        if (faqRes?.data?.success && faqRes.data.data) {
          // Filter out 'Owner' FAQs for the farmer app
          const backendFaqs = faqRes.data.data.filter(faq => faq.category !== 'Owner');
          
          const grouped = backendFaqs.reduce((acc, curr) => {
            const cat = curr.category || 'General';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push({ q: curr.question, a: curr.answer });
            return acc;
          }, {});

          const newCategories = Object.keys(grouped).map(cat => {
            let icon = FiHelpCircle;
            let color = '#3B82F6';
            if (cat === 'Farmer') { icon = FiBook; color = '#10B981'; }
            
            return {
              id: cat.toLowerCase(),
              title: cat + ' FAQs',
              icon,
              color,
              questions: grouped[cat]
            };
          });
          
          if (newCategories.length > 0) {
            setCategories(newCategories);
          }
        }
      } catch (error) {
        console.error('Failed to fetch FAQs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredQuestions = categories.flatMap(cat =>
    cat.questions.filter(q =>
      searchQuery === '' ||
      q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.a.toLowerCase().includes(searchQuery.toLowerCase())
    ).map(q => ({ ...q, category: cat.title, color: cat.color }))
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.state && window.history.state.idx > 0 ? navigate(-1) : navigate('/user')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FiArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">FAQ</h1>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      <main className="px-4 pt-4">
        {loading ? (
            <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" /></div>
        ) : (
          <>
            {/* FAQ Categories */}
            {searchQuery === '' && (
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Browse by Category</h2>
                {categories.length === 0 ? (
                  <div className="bg-white rounded-xl p-8 text-center text-gray-500">
                    No FAQs available yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {categories.map(category => (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id === selectedCategory ? null : category.id)}
                        className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all border border-gray-100"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: `${category.color}15` }}
                            >
                              <category.icon className="w-5 h-5" style={{ color: category.color }} />
                            </div>
                            <h3 className="font-semibold text-gray-900">{category.title}</h3>
                          </div>
                          <FiChevronRight
                            className={`w-5 h-5 text-gray-400 transition-transform ${selectedCategory === category.id ? 'rotate-90' : ''}`}
                          />
                        </div>

                        {/* Expanded Questions */}
                        {selectedCategory === category.id && (
                          <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                            {category.questions.map((item, idx) => (
                              <div key={idx} className="text-left">
                                <div className="flex items-start gap-2 mb-2">
                                  <FiHelpCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <p className="font-medium text-gray-900 text-sm">{item.q}</p>
                                </div>
                                <p className="text-sm text-gray-600 ml-6">{item.a}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Search Results */}
            {searchQuery !== '' && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3">
                  Search Results ({filteredQuestions.length})
                </h2>
                {filteredQuestions.length === 0 ? (
                  <div className="bg-white rounded-xl p-8 text-center">
                    <FiAlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">No results found for "{searchQuery}"</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredQuestions.map((item, idx) => (
                      <div key={idx} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-start gap-2 mb-2">
                          <span
                            className="text-xs font-semibold px-2 py-1 rounded-full"
                            style={{
                              backgroundColor: `${item.color}15`,
                              color: item.color
                            }}
                          >
                            {item.category}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 mb-2">
                          <FiHelpCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <p className="font-medium text-gray-900 text-sm">{item.q}</p>
                        </div>
                        <p className="text-sm text-gray-600 ml-6">{item.a}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default FAQ;
