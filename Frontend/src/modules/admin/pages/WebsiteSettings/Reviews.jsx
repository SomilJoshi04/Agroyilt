import React, { useState, useEffect } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiStar, FiSearch, FiUpload, FiUser } from "react-icons/fi";
import { toast } from "react-hot-toast";
import CardShell from "../../components/CardShell";
import Modal from "../../components/Modal";
import websiteService from "../../services/websiteService";
import LogoLoader from "../../../../components/common/LogoLoader";
import API from "../../../../services/api";

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploading, setUploading] = useState(false);
  
  const [form, setForm] = useState({
    userName: "",
    userRole: "",
    comment: "",
    rating: 5,
    userImage: "",
    isActive: true
  });

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await websiteService.getReviews();
      if (res.data.success) {
        setReviews(res.data.data);
      }
    } catch (error) {
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (review = null) => {
    if (review) {
      setEditingId(review._id);
      setForm({
        userName: review.userName || "",
        userRole: review.userRole || "",
        comment: review.comment || "",
        rating: review.rating || 5,
        userImage: review.userImage || "",
        isActive: review.isActive ?? true
      });
    } else {
      setEditingId(null);
      setForm({
        userName: "",
        userRole: "",
        comment: "",
        rating: 5,
        userImage: "",
        isActive: true
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
        setForm(prev => ({ ...prev, userImage: res.data.imageUrl }));
        toast.success("User image uploaded");
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
        const res = await websiteService.updateReview(editingId, form);
        if (res.data.success) {
          toast.success("Review updated");
          fetchReviews();
          setIsModalOpen(false);
        }
      } else {
        const res = await websiteService.createReview(form);
        if (res.data.success) {
          toast.success("Review created");
          fetchReviews();
          setIsModalOpen(false);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error saving review");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this review?")) return;
    try {
      const res = await websiteService.deleteReview(id);
      if (res.data.success) {
        toast.success("Review deleted");
        fetchReviews();
      }
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const filteredItems = reviews.filter(r => r.userName.toLowerCase().includes(searchTerm.trim().toLowerCase()));

  if (loading) return <LogoLoader />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Website Reviews</h2>
        <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-md">
          <FiPlus /> Add Review
        </button>
      </div>

      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search reviews by name..."
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <CardShell icon={FiStar}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Rating</th>
                <th className="px-4 py-3 text-left">Comment</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredItems.map(item => (
                <tr key={item._id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                         <div className="w-8 h-8 rounded-full overflow-hidden border bg-gray-50 flex items-center justify-center">
                            {item.userImage ? <img src={item.userImage} className="w-full h-full object-cover" alt="" /> : <FiUser className="text-gray-400" />}
                         </div>
                         <span className="font-semibold text-sm">{item.userName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 italic">{item.userRole}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-yellow-500">
                        {[...Array(5)].map((_, i) => <FiStar key={i} className={`w-3 h-3 ${i<item.rating?'fill-current':'text-gray-200'}`} />)}
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate text-xs text-gray-600">"{item.comment}"</td>
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Review" : "Add Review"}>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex justify-center mb-4">
             <div className="relative group">
                <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-primary-100 overflow-hidden flex items-center justify-center">
                    {uploading ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div> : form.userImage ? <img src={form.userImage} className="w-full h-full object-cover" alt="" /> : <FiUser className="text-3xl text-gray-300" />}
                </div>
                {form.userImage && !uploading && (
                  <button 
                    type="button" 
                    onClick={() => setForm({ ...form, userImage: "" })}
                    className="absolute -top-1 -left-1 bg-red-500 text-white rounded-full p-1 border-2 border-white shadow-md hover:bg-red-600 transition-colors"
                    title="Remove Image"
                  >
                    <FiTrash2 className="w-3 h-3" />
                  </button>
                )}
                <label className="absolute bottom-0 right-0 w-7 h-7 bg-primary-600 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-700 shadow-lg">
                    <FiUpload className="text-[10px]" />
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                </label>
             </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-bold mb-1 text-gray-700">User Name</label>
                <input required type="text" className="w-full px-4 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500" value={form.userName} onChange={e => setForm({...form, userName: e.target.value})} />
            </div>
            <div>
                <label className="block text-sm font-bold mb-1 text-gray-700">User Role</label>
                <input required type="text" className="w-full px-4 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500" placeholder="Ex: Progressive Farmer" value={form.userRole} onChange={e => setForm({...form, userRole: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1 text-gray-700">Rating (1-5)</label>
            <select className="w-full px-4 py-2 border rounded-xl text-sm outline-none" value={form.rating} onChange={e => setForm({...form, rating: parseInt(e.target.value)})}>
                {[5,4,3,2₹].map(r => <option key={r} value={r}>{r} Stars</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1 text-gray-700">Review Comment</label>
            <textarea required rows="4" className="w-full px-4 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500" placeholder="Write the review here..." value={form.comment} onChange={e => setForm({...form, comment: e.target.value})} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="rev-active" className="w-4 h-4 text-primary-600" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} />
            <label htmlFor="rev-active" className="text-sm font-semibold text-gray-700">Display review on site</label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 bg-gray-100 rounded-xl font-semibold hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={uploading} className="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold shadow-md hover:bg-primary-700">Add Review</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Reviews;
