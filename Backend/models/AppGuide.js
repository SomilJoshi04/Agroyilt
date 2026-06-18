const mongoose = require('mongoose');

const appGuideSchema = new mongoose.Schema({
    questions: [{
        question: { type: String, required: true },
        answer: { type: String, required: true },
        media: [{
            url: { type: String, required: true },
            type: { type: String, enum: ['image', 'video', 'pdf'], required: true }
        }]
    }]
}, { timestamps: true });

module.exports = mongoose.model('AppGuide', appGuideSchema);
