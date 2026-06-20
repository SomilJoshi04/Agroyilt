import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import WorkflowSection from '../components/WorkflowSection';
import EcosystemFlow from '../components/EcosystemFlow';

const WorkflowPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Helmet>
        <title>Workflow | GrooAgri</title>
        <meta name="description" content="Discover how GrooAgri works and our ecosystem flow." />
      </Helmet>
      <Navbar />
      <div className="flex-grow pt-20">
        <WorkflowSection />
        <EcosystemFlow />
      </div>
      <Footer />
    </div>
  );
};

export default WorkflowPage;
