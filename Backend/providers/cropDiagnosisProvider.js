class MockCropDiagnosisProvider {
  async diagnose(imageUrl) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      disease: "Powdery Mildew",
      confidence: 0.89,
      symptoms: ["White powdery spots on leaves", "Leaf curling"],
      treatment: ["Apply sulfur-based fungicide", "Improve air circulation"]
    };
  }
}

class PlantixProvider {
  async diagnose(imageUrl) {
    throw new Error('Plantix API not implemented yet');
  }
}

class OpenAIVisionProvider {
  async diagnose(imageUrl) {
    throw new Error('OpenAI Vision API not implemented yet');
  }
}

// Swappable Provider Factory
class CropDiagnosisFactory {
  static getProvider() {
    const providerStr = process.env.CROP_DIAGNOSIS_PROVIDER || 'mock';
    switch (providerStr) {
      case 'plantix': return new PlantixProvider();
      case 'openai': return new OpenAIVisionProvider();
      case 'mock': 
      default:
        return new MockCropDiagnosisProvider();
    }
  }
}

module.exports = CropDiagnosisFactory;
