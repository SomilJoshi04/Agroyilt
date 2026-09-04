import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import FAQSection from '../components/FAQSection';

const FAQPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Helmet>
        <title>FAQ | Agroyilt</title>
        <meta name="description" content="Frequently asked questions about Agroyilt." />
      </Helmet>
      <Navbar />
      <div className="flex-grow pt-20">
        <FAQSection />
      </div>
      <Footer />
    </div>
  );
};

export default FAQPage;
