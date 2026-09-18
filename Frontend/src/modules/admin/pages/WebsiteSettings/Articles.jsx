import React, { useState, useEffect } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiFileText, FiSearch, FiUpload } from "react-icons/fi";
import { toast } from "react-hot-toast";
import CardShell from "../../components/CardShell";
import Modal from "../../components/Modal";
import websiteService from "../../services/websiteService";
import LogoLoader from "../../../../components/common/LogoLoader";
import API from "../../../../services/api";

const Articles = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploading, setUploading] = useState(false);
  
  const [form, setForm] = useState({
    title: "",
    content: "",
    image: "",
    isActive: true,
    category: "General"
  });

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const res = await websiteService.getArticles();
      if (res.data.success) {
        setArticles(res.data.data);
      }
    } catch (error) {
      toast.error("Failed to load articles");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (article = null) => {
    if (article) {
      setEditingId(article._id);
      setForm({
        title: article.title || "",
        content: article.content || "",
        image: article.image || "",
        isActive: article.isActive ?? true,
        category: article.category || "General"
      });
    } else {
      setEditingId(null);
      setForm({
        title: "",
        content: "",
        image: "",
        isActive: true,
        category: "General"
      });
    }
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setUploading(true);
      const res = await API.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setForm(prev => ({ ...prev, image: res.data.imageUrl }));
        toast.success("Image uploaded");
      }
    } catch (error) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const res = await websiteService.updateArticle(editingId, form);
        if (res.data.success) {
          toast.success("Article updated");
          fetchArticles();
          setIsModalOpen(false);
        }
      } else {
        const res = await websiteService.createArticle(form);
        if (res.data.success) {
          toast.success("Article created");
          fetchArticles();
          setIsModalOpen(false);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error saving article");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this article?")) return;
    try {
      const res = await websiteService.deleteArticle(id);
      if (res.data.success) {
        toast.success("Article deleted");
        fetchArticles();
      }
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const filteredItems = articles.filter(a => a.title.toLowerCase().includes(searchTerm.trim().toLowerCase()));

  if (loading) return <LogoLoader />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Manage Articles</h2>
        <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          <FiPlus /> Add Article
        </button>
      </div>

      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search articles..."
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <CardShell icon={FiFileText}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left">Hero Image</th>
                <th className="px-4 py-3 text-left">Summary</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredItems.map(item => (
                <tr key={item._id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <img src={item.image || "https://placehold.jp/150x80.png"} className="w-16 h-10 object-cover rounded" alt="" />
                  </td>
                  <td className="px-4 py-3 font-semibold">{item.title}</td>
                  <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider rounded-lg border">{item.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${item.isActive ? 'bg-green-100 text-green-600':'bg-red-100 text-red-600'}`}>
                        {item.isActive?'Active':'Hidden'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => handleOpenModal(item)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><FiEdit2 /></button>
                      <button onClick={() => handleDelete(item._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardShell>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Article" : "Add Article"}>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">Article Title</label>
            <input required type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Article Category</label>
            <input required type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Ex: Organic Farming, Pest Control" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Article Image</label>
            <div className="flex items-center gap-4">
               {form.image && (
                 <div className="relative group">
                    <img src={form.image} className="w-20 h-14 object-cover rounded border" alt="" />
                    <button 
                      type="button" 
                      onClick={() => setForm({ ...form, image: "" })}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <FiTrash2 className="w-3 h-3" />
                    </button>
                 </div>
               )}
               <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 border rounded-lg cursor-pointer hover:bg-gray-200">
                  <FiUpload /> {uploading ? 'Uploading...':'Upload'}
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
               </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Content</label>
            <textarea required rows="6" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" value={form.content} onChange={e => setForm({...form, content: e.target.value})} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="article-active" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} />
            <label htmlFor="article-active" className="text-sm font-semibold">Enable on website</label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 bg-gray-100 rounded-lg font-semibold hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={uploading} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold shadow-md hover:bg-primary-700">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Articles;
