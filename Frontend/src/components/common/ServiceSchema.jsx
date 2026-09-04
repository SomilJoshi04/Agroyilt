import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * ServiceSchema generates JSON-LD for individual machinery or products
 */
const ServiceSchema = ({ data }) => {
  if (!data) return null;

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Product", // Equipment is often categorized as Product for commerce rich snippets
    "name": data.name,
    "image": data.images?.[0] || "https://agroyilt.com/AgroyiltLogo.png",
    "description": data.description || `Professional agriculture ${data.name} available for rent on Agroyilt.`,
    "brand": {
      "@type": "Brand",
      "name": data.vendorId?.businessName || "Agroyilt"
    },
    "offers": {
      "@type": "Offer",
      "url": `https://agroyilt.com/user/machinery/${data._id}`,
      "priceCurrency": "INR",
      "price": data.pricing?.hourly?.price || data.pricing?.land_based?.price || 0,
      "availability": "https://schema.org/InStock"
    },
    "aggregateRating": data.vendorId?.rating ? {
      "@type": "AggregateRating",
      "ratingValue": data.vendorId.rating,
      "reviewCount": data.vendorId.totalReviews || 1
    } : undefined
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schemaData)}
      </script>
    </Helmet>
  );
};

export default ServiceSchema;
