import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiBriefcase } from 'react-icons/fi';
import workerService from '../../services/workerService';
import LogoLoader from '../../../../components/common/LogoLoader';

const WorkerBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const res = await workerService.getAllWorkerJobs();
        if (res.success) {
          setBookings(res.data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6">
      <h2 className="text-lg font-black text-slate-800 mb-4">Worker Bookings</h2>
      
      {loading ? (
        <div className="flex justify-center py-20"><LogoLoader /></div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiBriefcase className="text-slate-400 text-2xl" />
          </div>
          <h3 className="text-lg font-black text-slate-800">No bookings yet</h3>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map(booking => (
            <div key={booking._id} className="p-4 border border-slate-100 rounded-2xl bg-slate-50">
              <p className="font-bold">{booking._id}</p>
              <p className="text-sm text-slate-500">Status: {booking.status}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkerBookings;
