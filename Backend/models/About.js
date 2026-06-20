const mongoose = require('mongoose');

const aboutSchema = new mongoose.Schema({
    content: {
        type: String, // Rich HTML content
        required: true,
    },
    title: {
        type: String,
        default: 'About Us'
    },
    images: [{
        url: { type: String, required: true },
        name: { type: String, default: '' }
    }],
    videoUrl: {
        type: String,
        default: ''
    },
    videoDescription: {
        type: String,
        default: ''
    },
    videos: [{
        url: { type: String, required: true },
        description: { type: String, default: '' }
    }]
}, { timestamps: true });

module.exports = mongoose.model('About', aboutSchema);
