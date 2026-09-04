const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.chatWithBot = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not set in environment variables");
      return res.status(500).json({ success: false, message: "Chatbot API key is not configured." });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Read the project knowledge base file
    const fs = require('fs');
    const path = require('path');
    let projectKnowledge = "";
    try {
      const kbPath = path.join(__dirname, '../utils/chatbot_knowledge.txt');
      projectKnowledge = fs.readFileSync(kbPath, 'utf8');
    } catch (err) {
      console.warn("Knowledge base file not found or couldn't be read.");
    }

    // System Instruction to customize the bot for Agroyilt
    const systemInstruction = `
      तुम 'Agroyilt' के एक अनुभवी 'Agriculture Scientist' (कृषि वैज्ञानिक) और 'Agriculture Service Provider' (कृषि सेवा प्रदाता) हो। 
      तुम्हारा काम किसानों को खेती, फसलों की बीमारियों, आधुनिक कृषि तकनीकों, सही उपकरण/खाद/बीज के चुनाव और Agroyilt की सेवाओं के बारे में सटीक, वैज्ञानिक और लाभकारी सलाह देना है।
      
      यहाँ Agroyilt कंपनी की पूरी जानकारी (Knowledge Base) दी गई है (ताकि तुम कंपनी की सेवाओं के बारे में सही जवाब दे सको):
      """
      \${projectKnowledge}
      """
      
      नियम:
      1. एक कृषि वैज्ञानिक की तरह सटीक, उपयोगी और वैज्ञानिक सलाह दो। खेती से जुड़े सवालों (जैसे फसल की बीमारी, बुवाई, मिट्टी) का जवाब अपनी विशेषज्ञता (expertise) के आधार पर विस्तार (detail) से दो।
      2. अगर सवाल Agroyilt की सेवाओं, प्रोजेक्ट या बुकिंग से जुड़ा है, तो ऊपर दी गई "Knowledge Base" की जानकारी का इस्तेमाल करते हुए एक डिटेल एनालिसिस (detailed analysis) और पूरा विवरण दो।
      3. अगर कोई यूज़र खेती या Agroyilt के अलावा कुछ और पूछता है (जैसे राजनीति, फ़िल्में, कोडिंग, आदि), तो नम्रता से मना कर दो और कहो: "मैं Agroyilt का कृषि विशेषज्ञ हूँ, मैं केवल कृषि और खेती से जुड़े सवालों के जवाब दे सकता हूँ।"
      4. तुम्हारे जवाब हिंदी और इंग्लिश (Hinglish) में, स्पष्ट, और बहुत ही जानकारीपूर्ण (informative & detailed) होने चाहिए। अगर यूज़र प्रोजेक्ट के बारे में पूछे, तो उसके सभी मॉड्यूल्स (जैसे Farmers, Vendors, Workers, Soil Testing आदि) को अच्छे से समझाओ।
      5. हमेशा प्यार से, सम्मान के साथ और एक मार्गदर्शक (guide) की तरह मददगार तरीके से बात करो।
      6. अपने जवाब को मार्कडाउन (markdown) फॉर्मेट में मत देना, पॉइंट-वाइज़ (point-wise) प्लेन टेक्स्ट या सिंपल पैराग्राफ इस्तेमाल करना ताकि मोबाइल UI में पढ़ने में आसानी हो।
    `;

    let text;
    try {
      const model = genAI.getGenerativeModel({ 
        model: "gemini-flash-latest",
        systemInstruction: systemInstruction 
      });
      const result = await model.generateContent(message);
      text = result.response.text();
    } catch (error) {
      console.warn("Primary model 'gemini-flash-latest' failed, trying fallback...", error.message);
      try {
        const fallbackModel = genAI.getGenerativeModel({ 
          model: "gemini-pro",
        });
        // gemini-pro does not officially support systemInstruction in the same way, but we can prepend the prompt
        // Or we can just use gemini-1.5-flash-latest
        const fallbackResult = await fallbackModel.generateContent(`${systemInstruction}\n\nUser Question: ${message}`);
        text = fallbackResult.response.text();
      } catch (fallbackError) {
        throw fallbackError; // If fallback also fails, throw to main catch block
      }
    }

    res.status(200).json({ 
      success: true,
      reply: text 
    });

  } catch (error) {
    console.error("Chatbot API Error:", error);
    res.status(500).json({ success: false, message: "Chatbot service is currently unavailable. Please try again later." });
  }
};
