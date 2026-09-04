const express = require('express');
const router = express.Router();
const Category = require('../../models/Category');
const VendorEquipment = require('../../models/VendorEquipment');
const Blog = require('../../models/Blog');

/**
 * Generate a dynamic sitemap.xml
 * Includes main pages, categories, and machinery
 */
router.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = 'https://agroyilt.com';
    
    // Static Pages
    const staticPages = [
      '',
      '/blogs',
      '/user/machinery-explorer',
      '/vendor/login',
      '/about'
    ];

    // Fetch Dynamic Data
    const [categories, equipment, blogs] = await Promise.all([
      Category.find({ status: 'active' }).select('_id title'),
      VendorEquipment.find({ status: 'active' }).select('_id name'),
      Blog.find({ status: 'published' }).select('_id slug title')
    ]);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // 1. Add Static Pages
    staticPages.forEach(page => {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}${page}</loc>\n`;
      xml += '    <changefreq>daily</changefreq>\n';
      xml += '    <priority>1.0</priority>\n';
      xml += '  </url>\n';
    });

    // 2. Add Machinery Catalog (User Pages)
    equipment.forEach(item => {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/user/machinery/${item._id}</loc>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.9</priority>\n';
      xml += '  </url>\n';
    });

    // 3. Add Blog Posts
    blogs.forEach(post => {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/blogs/${post._id}</loc>\n`;
      xml += '    <changefreq>monthly</changefreq>\n';
      xml += '    <priority>0.7</priority>\n';
      xml += '  </url>\n';
    });

    xml += '</urlset>';

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Sitemap Generation Error:', error);
    res.status(500).send('Error generating sitemap');
  }
});

module.exports = router;
