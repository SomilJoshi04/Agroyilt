import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ProblemSolution from './components/ProblemSolution';
import ServicesSection from './components/ServicesSection';
import WorkflowSection from './components/WorkflowSection';
import FeatureSection from './components/FeatureSection';
import EcosystemFlow from './components/EcosystemFlow';

import CTA from './components/CTA';
import Footer from './components/Footer';
import CompanyDeepDive from './components/CompanyDeepDive';
import LiveContentSection from './components/LiveContentSection';
import TestimonialSection from './components/TestimonialSection';
import AboutSection from './components/AboutSection';
import FAQSection from './components/FAQSection';

const LandingPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Agroyilt | Professional Agriculture Equipment & Farm Solutions</title>
        <meta name="description" content="Empowering Indian farmers with easy access to high-quality agriculture machinery. Rent tractors, harvesters, and tools from verified local vendors." />
        <link rel="canonical" href="https://agroyilt.com/" />
      </Helmet>
      <Navbar />
      <Hero />
      <AboutSection />
      <ProblemSolution />
      <ServicesSection />
      <WorkflowSection />
      <EcosystemFlow />
      <LiveContentSection />
      <FeatureSection />
      <TestimonialSection />
      <CompanyDeepDive />
      <FAQSection />

      <CTA />
      <Footer />
    </div>
  );
};

export default LandingPage;
