import React, { useState, useEffect } from 'react';
import {
    FiHelpCircle, FiSearch, FiFilter, FiCheckCircle,
    FiMessageSquare, FiUser, FiMail, FiClock, FiEye, FiSend
} from 'react-icons/fi';
import { toastManager } from '../../../../utils/toastManager';
import adminSupportService from '../../../../services/adminSupportService';
import Modal from '../../components/Modal';

const AdminSupport = () => {
    const [queries, setQueries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedQuery, setSelectedQuery] = useState(null);
    const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
    const [responseMessage, setResponseMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchQueries();
    }, [statusFilter]);

    const fetchQueries = async () => {
        try {
            setLoading(true);
            const response = await adminSupportService.getQueries({ status: statusFilter });
            if (response.success) {
                setQueries(response.data);
            }
        } catch (error) {
            toastManager.error('Failed to fetch support queries');
        } finally {
            setLoading(false);
        }
    };

    const filteredQueries = queries.filter(q => 
        q.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.message.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenResponse = (query) => {
        setSelectedQuery(query);
        setResponseMessage(query.response || '');
        setIsResponseModalOpen(true);
    };

    const handleSendResponse = async () => {
        if (!responseMessage.trim()) {
            return toastManager.error('Please enter a response message');
        }

        try {
            setSubmitting(true);
            const response = await adminSupportService.respondToQuery(selectedQuery._id, {
                response: responseMessage,
                status: 'resolved'
            });
            if (response.success) {
                toastManager.success('Response sent and query resolved');
                setIsResponseModalOpen(false);
                fetchQueries();
            }
        } catch (error) {
            toastManager.error('Failed to send response');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: 'bg-amber-100 text-amber-700 border-amber-200',
            'in-progress': 'bg-blue-100 text-blue-700 border-blue-200',
            resolved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            closed: 'bg-gray-100 text-gray-700 border-gray-200'
        };
        return (
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${styles[status]}`}>
                {status.toUpperCase()}
            </span>
        );
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <FiHelpCircle className="text-primary-600" />
                        Help & Support Requests
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Manage and respond to user queries and help requests.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative w-full sm:w-64">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search requests..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                    </div>
                    <div className="relative w-full sm:w-auto">
                        <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 outline-none appearance-none cursor-pointer"
                        >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="in-progress">In-Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/50 border-b border-gray-100 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                        <tr>
                            <th className="px-6 py-4">User</th>
                            <th className="px-6 py-4">Subject</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Submitted At</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan="5" className="px-6 py-4 h-16 bg-gray-50/20"></td>
                                </tr>
                            ))
                        ) : filteredQueries.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center opacity-30">
                                        <FiMessageSquare className="w-12 h-12 mb-2" />
                                        <p className="font-bold">No support requests found</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            queries.map((q) => (
                                <tr key={q._id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {q.userId?.profilePhoto ? (
                                                <img src={q.userId.profilePhoto} className="w-10 h-10 rounded-xl object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
                                                    {q.name[0]}
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 leading-none mb-1">{q.name}</p>
                                                <p className="text-xs text-gray-400 line-clamp-1">{q.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-gray-700 mb-1">{q.subject}</p>
                                        <p className="text-xs text-gray-400 line-clamp-1">{q.message}</p>
                                    </td>
                                    <td className="px-6 py-4">{getStatusBadge(q.status)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                            <FiClock /> {new Date(q.createdAt).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleOpenResponse(q)}
                                            className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-primary-600 hover:text-white transition-all shadow-sm active:scale-95 border border-gray-100"
                                        >
                                            <FiEye className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Response Modal */}
            <Modal
                isOpen={isResponseModalOpen}
                onClose={() => setIsResponseModalOpen(false)}
                title="Support Ticket Details"
            >
                {selectedQuery && (
                    <div className="space-y-6">
                        {/* User Profile */}
                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-[24px] border border-gray-100">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary-600 font-black shadow-sm border border-gray-100">
                                {selectedQuery.name[0]}
                            </div>
                            <div>
                                <h3 className="font-black text-gray-900 tracking-tight">{selectedQuery.name}</h3>
                                <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                                    <span className="flex items-center gap-1"><FiMail size={12}/> {selectedQuery.email}</span>
                                    <span className="flex items-center gap-1 font-bold"># {selectedQuery._id.slice(-6).toUpperCase()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Query Content */}
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 pl-1">Subject & Message</p>
                            <div className="bg-primary-50/30 p-5 rounded-[24px] border border-primary-100/50">
                                <h4 className="font-black text-primary-900 mb-2">{selectedQuery.subject}</h4>
                                <p className="text-sm text-gray-700 leading-relaxed italic">
                                    "{selectedQuery.message}"
                                </p>
                            </div>
                        </div>

                        {/* Admin Response */}
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 pl-1">Admin Response</p>
                            <textarea
                                value={responseMessage}
                                onChange={(e) => setResponseMessage(e.target.value)}
                                className="w-full h-32 p-4 bg-white border border-gray-200 rounded-[24px] text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none transition-all shadow-sm"
                                placeholder="Type your response to the user here..."
                                disabled={selectedQuery.status === 'resolved'}
                            />
                        </div>

                        {/* Actions */}
                        {selectedQuery.status !== 'resolved' ? (
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsResponseModalOpen(false)}
                                    className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSendResponse}
                                    disabled={submitting}
                                    className="flex-[2] py-4 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <FiSend />
                                    {submitting ? 'Sending...' : 'Send Response & Resolve'}
                                </button>
                            </div>
                        ) : (
                            <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl flex items-center gap-3 border border-emerald-100">
                                <FiCheckCircle size={20} className="shrink-0" />
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wider">Query Resolved</p>
                                    <p className="text-[11px] opacity-80 mt-0.5">Response sent on {new Date(selectedQuery.respondedAt).toLocaleString()}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AdminSupport;
