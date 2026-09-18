import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * BreadcrumbsSchema generates JSON-LD for BreadcrumbList
 * @param {Array} items - List of objects { name: string, item: string }
 */
const BreadcrumbsSchema = ({ items = [] }) => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.name,
      "item": crumb.item.startsWith('http') ? crumb.item : `https://agroyilt.com${crumb.item}`
    }))
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schemaData)}
      </script>
    </Helmet>
  );
};

export default BreadcrumbsSchema;
