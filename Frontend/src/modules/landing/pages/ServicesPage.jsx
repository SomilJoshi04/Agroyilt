import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ServicesSection from '../components/ServicesSection';

const ServicesPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Helmet>
        <title>Our Services | Agroyilt</title>
        <meta name="description" content="Explore the professional agriculture equipment and farm solutions offered by Agroyilt." />
      </Helmet>
      <Navbar />
      <div className="flex-grow pt-20">
        <ServicesSection />
      </div>
      <Footer />
    </div>
  );
};

export default ServicesPage;
