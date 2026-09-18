import React, { useState, useEffect, useRef } from "react";
import { FiSave, FiInfo, FiPlus, FiTrash2, FiImage, FiVideo, FiX } from "react-icons/fi";
import { toast } from "react-hot-toast";
import CardShell from "../../components/CardShell";
import API from "../../../../services/api";
import LogoLoader from "../../../../components/common/LogoLoader";
import { uploadToCloudinary } from "../../../../services/cloudinaryService";

const AppGuide = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [questions, setQuestions] = useState([
    { question: "", answer: "", media: [] }
  ]);

  const fileInputRefs = useRef({});

  useEffect(() => {
    fetchGuide();
  }, []);

  const fetchGuide = async () => {
    try {
      setLoading(true);
      const res = await API.get('/content/app-guide');
      if (res.data.success && res.data.data && res.data.data.questions) {
        setQuestions(res.data.data.questions.length > 0 ? res.data.data.questions : [{ question: "", answer: "", media: [] }]);
      }
    } catch (error) {
      toast.error("Failed to load App Guide content");
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setQuestions([...questions, { question: "", answer: "", media: [] }]);
  };

  const handleRemoveQuestion = (index) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
  };

  const handleChange = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const handleMediaUpload = async (index, file) => {
    if (!file) return;
    
    // Check type
    const isVideo = file.type.startsWith('video/');
    const isPdf = file.type === 'application/pdf';
    const type = isVideo ? 'video' : isPdf ? 'pdf' : 'image';
    
    try {
      const loadingToast = toast.loading(`Uploading ${type}...`);
      const url = await uploadToCloudinary(file);
      
      const updated = [...questions];
      if (!updated[index].media) updated[index].media = [];
      updated[index].media.push({ url, type });
      setQuestions(updated);
      
      toast.dismiss(loadingToast);
      toast.success(`${type} uploaded successfully!`);
    } catch (error) {
      console.error(error);
      toast.error(`Failed to upload ${type}`);
    }
  };

  const removeMedia = (questionIndex, mediaIndex) => {
    const updated = [...questions];
    updated[questionIndex].media.splice(mediaIndex, 1);
    setQuestions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await API.put('/content/app-guide', { questions });
      if (res.data.success) {
        toast.success("App Guide updated");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error saving guide");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LogoLoader />;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Manage App Guide</h2>
        <button 
          onClick={handleAddQuestion}
          className="flex items-center gap-2 bg-primary-50 text-primary-600 px-4 py-2 rounded-lg font-bold hover:bg-primary-100 transition-colors"
        >
          <FiPlus /> Add Step/Question
        </button>
      </div>

      <CardShell icon={FiInfo}>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          <div className="bg-green-50 p-4 rounded-lg text-green-800 text-sm flex gap-3 border border-green-100">
             <FiInfo className="shrink-0 mt-0.5 text-green-600" size={18} />
             <p>Add multiple steps or questions. Each item will be displayed as a step in the user app. You can also add an image or a short video for each step.</p>
          </div>

          <div className="space-y-6">
            {questions.map((q, idx) => (
              <div key={idx} className="p-4 sm:p-6 border border-gray-200 rounded-xl relative group bg-white shadow-sm hover:shadow-md transition-shadow">
                <button 
                  type="button" 
                  onClick={() => handleRemoveQuestion(idx)}
                  className="absolute top-4 right-4 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity bg-red-50 p-2 rounded-full"
                  title="Remove this step"
                >
                  <FiTrash2 size={16} />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left: Text Inputs */}
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Step Title / Question</label>
                      <input 
                        required 
                        type="text" 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all" 
                        value={q.question} 
                        onChange={e => handleChange(idx, 'question', e.target.value)} 
                        placeholder="e.g. How to book a machine?"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Description / Answer</label>
                      <textarea 
                        required 
                        rows="4" 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none leading-relaxed transition-all" 
                        value={q.answer} 
                        onChange={e => handleChange(idx, 'answer', e.target.value)} 
                        placeholder="e.g. Select the machine from the catalog and click Book..."
                      />
                    </div>
                  </div>

                  {/* Right: Media Upload */}
                  <div className="md:col-span-1">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Media (Optional)</label>
                    <div className="flex flex-wrap gap-3">
                      {q.media && q.media.map((m, mIdx) => (
                        <div key={mIdx} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 group/media shadow-sm bg-gray-50 flex items-center justify-center shrink-0">
                          {m.type === 'video' ? (
                            <video 
                              src={m.url}
                              controls 
                              playsInline
                              preload="auto"
                              className="w-full h-full object-contain bg-black"
                            />
                          ) : m.type === 'pdf' ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-500">
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                              <span className="text-[10px] font-bold mt-1">PDF</span>
                            </div>
                          ) : (
                            <img src={m.url} alt="Step media" className="w-full h-full object-cover" />
                          )}
                          <button 
                            type="button"
                            onClick={() => removeMedia(idx, mIdx)}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover/media:opacity-100 transition-opacity hover:bg-red-600"
                          >
                            <FiX size={12} />
                          </button>
                        </div>
                      ))}
                      
                      {/* Upload Button */}
                      <div 
                        onClick={() => fileInputRefs.current[idx]?.click()}
                        className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-primary-50 hover:border-primary-300 transition-colors cursor-pointer flex flex-col items-center justify-center p-2 text-center group/upload shrink-0"
                      >
                        <div className="flex gap-1 mb-1">
                          <FiImage className="w-3.5 h-3.5 text-gray-400 group-hover/upload:text-primary-500 transition-colors" />
                          <FiVideo className="w-3.5 h-3.5 text-gray-400 group-hover/upload:text-primary-500 transition-colors" />
                          <svg className="w-3.5 h-3.5 text-gray-400 group-hover/upload:text-primary-500 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
                        </div>
                        <span className="text-[10px] font-semibold text-gray-600 group-hover/upload:text-primary-600 transition-colors">Add Media</span>
                      </div>
                    </div>

                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*,video/mp4,video/webm,application/pdf" 
                      ref={el => fileInputRefs.current[idx] = el}
                      onChange={(e) => {
                        handleMediaUpload(idx, e.target.files[0]);
                        e.target.value = null; // reset to allow same file again
                      }} 
                    />
                  </div>
                </div>
              </div>
            ))}
            
            {questions.length === 0 && (
              <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                <p className="font-semibold mb-2">No steps added yet.</p>
                <button 
                  type="button"
                  onClick={handleAddQuestion}
                  className="text-primary-600 hover:text-primary-700 font-bold text-sm"
                >
                  Click here to add your first step
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-6 border-t mt-8">
            <button 
              type="submit" 
              disabled={saving}
              className="px-8 py-3 bg-primary-600 text-white rounded-lg font-bold shadow-md hover:bg-primary-700 flex items-center gap-2 disabled:bg-primary-400 disabled:cursor-not-allowed transition-colors"
            >
              <FiSave /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </CardShell>
    </div>
  );
};

export default AppGuide;
