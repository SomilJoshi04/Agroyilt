import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUsers, FiUserPlus, FiUserCheck, FiUserX, FiCheck, FiX, FiLogOut } from 'react-icons/fi';
import { workerTheme as themeColors } from '../../../../theme';
import api from '../../../../services/api';
import { toastManager } from '../../../../utils/toastManager';
import { useSocket } from '../../../../context/SocketContext';
import Header from '../../components/layout/Header';

const WorkerTeam = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [leader, setLeader] = useState(null);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Current user's profile to know if they are TEAM_LEADER or WORKER
  const [profile, setProfile] = useState(null);

  const socket = useSocket();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch profile to get workerType
      const profileRes = await api.get('/workers/profile');
      let currentWorkerType = 'WORKER';
      if (profileRes.data.success) {
        setProfile(profileRes.data.worker);
        currentWorkerType = profileRes.data.worker.workerType;
      }

      // Fetch team
      const teamRes = await api.get('/workers/team/me');
      if (teamRes.data.success) {
        setTeam(teamRes.data.team);
        if (teamRes.data.members) setMembers(teamRes.data.members);
        if (teamRes.data.leader) setLeader(teamRes.data.leader);
      }

      // Fetch requests
      const reqRes = await api.get('/workers/team/requests');
      if (reqRes.data.success) {
        setIncomingRequests(reqRes.data.incoming);
        setOutgoingRequests(reqRes.data.outgoing);
      }

      // Fetch default eligible workers if TEAM_LEADER
      if (currentWorkerType === 'TEAM_LEADER') {
        try {
          const eligibleRes = await api.get('/workers/team/eligible-workers');
          if (eligibleRes.data.success) {
            setSearchResults(eligibleRes.data.workers || []);
          }
        } catch (err) {
          console.error("Failed to fetch default eligible workers");
        }
      }

    } catch (error) {
      toastManager.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.length < 3) {
      toastManager.error('Please enter at least 3 characters');
      return;
    }
    try {
      setSearchLoading(true);
      const res = await api.get(`/workers/team/eligible-workers?query=${searchQuery}`);
      if (res.data.success) {
        setSearchResults(res.data.workers);
        if (res.data.workers.length === 0) toastManager.error('No eligible workers found');
      }
    } catch (error) {
      toastManager.error('Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const sendRequest = async (receiverId, type) => {
    try {
      const res = await api.post('/workers/team/requests', { receiverId, type });
      if (res.data.success) {
        toastManager.success('Request sent successfully');
        fetchData();
        setSearchResults([]);
        setSearchQuery('');
      }
    } catch (error) {
      toastManager.error(error.response?.data?.message || 'Failed to send request');
    }
  };

  const acceptRequest = async (requestId) => {
    try {
      const res = await api.post(`/workers/team/requests/${requestId}/accept`);
      if (res.data.success) {
        toastManager.success('Request accepted');
        fetchData();
      }
    } catch (error) {
      toastManager.error(error.response?.data?.message || 'Failed to accept request');
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      const res = await api.post(`/workers/team/requests/${requestId}/reject`);
      if (res.data.success) {
        toastManager.success('Request rejected');
        fetchData();
      }
    } catch (error) {
      toastManager.error('Failed to reject request');
    }
  };

  const removeMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      const res = await api.post('/workers/team/remove', { memberId });
      if (res.data.success) {
        toastManager.success('Member removed');
        fetchData();
      }
    } catch (error) {
      toastManager.error(error.response?.data?.message || 'Failed to remove member');
    }
  };

  const leaveTeam = async () => {
    if (!window.confirm('Are you sure you want to leave this team?')) return;
    try {
      const res = await api.post('/workers/team/leave');
      if (res.data.success) {
        toastManager.success('You have left the team');
        fetchData();
      }
    } catch (error) {
      toastManager.error(error.response?.data?.message || 'Failed to leave team');
    }
  };

  const upgradeToLeader = async () => {
    try {
      setLoading(true);
      const res = await api.post('/workers/team/upgrade-to-leader');
      if (res.data.success) {
        toastManager.success('You are now a Team Leader!');
        // Update local profile
        setProfile(prev => ({ ...prev, workerType: 'TEAM_LEADER' }));
        fetchData();
      }
    } catch (error) {
      toastManager.error(error.response?.data?.message || 'Failed to upgrade');
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4 text-center">Loading...</div>;

  const isTeamLeader = profile?.workerType === 'TEAM_LEADER';

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <Header title={isTeamLeader ? "Team Management" : "My Team"} showBack={true} />

      <main className="p-4 space-y-6">
        {/* Team Status Card */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-2">
            {team ? team.name : (isTeamLeader ? "You don't have a team yet" : "You are not in a team")}
          </h2>
          {team && (
            <p className="text-gray-600 text-sm">
              Members: {team.memberCount} / {team.maxCapacity}
            </p>
          )}
          {team && team.status === 'MIGRATING' && (
            <div className="mt-2 text-orange-600 font-medium text-sm bg-orange-50 p-2 rounded-lg">
              Team is migrating. Members are being transferred.
            </div>
          )}
          {!isTeamLeader && team && (
            <button 
              onClick={leaveTeam}
              className="mt-4 w-full py-2 bg-red-50 text-red-600 font-semibold rounded-lg flex items-center justify-center gap-2"
            >
              <FiLogOut /> Leave Team
            </button>
          )}
          {!isTeamLeader && !team && (
            <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <h3 className="font-bold text-blue-800 mb-2">Want to add members?</h3>
              <p className="text-sm text-blue-600 mb-3">Upgrade to a Team Leader to start building and managing your own team.</p>
              <button 
                onClick={upgradeToLeader}
                className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm"
              >
                Become a Team Leader
              </button>
            </div>
          )}
        </div>

        {/* Incoming Requests */}
        {incomingRequests.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
              <h3 className="font-bold text-blue-800 flex items-center gap-2">
                <FiUserPlus /> Incoming Requests ({incomingRequests.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {incomingRequests.map(req => (
                <div key={req._id} className="p-4 flex flex-col gap-3">
                  <div>
                    <div className="font-semibold text-gray-800">{req.senderId.name}</div>
                    <div className="text-sm text-gray-500">
                      {req.type === 'JOIN_WORKER' && `Invited you to join ${req.targetTeamId?.name}`}
                      {req.type === 'MERGE_TEAM' && `Requested to merge your team into ${req.targetTeamId?.name}`}
                      {req.type === 'MIGRATION_TRANSFER' && `Your team is migrating. Please accept the transfer to ${req.targetTeamId?.name}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => acceptRequest(req._id)} className="flex-1 bg-green-500 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-1">
                      <FiCheck /> Accept
                    </button>
                    <button onClick={() => rejectRequest(req._id)} className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg font-medium flex items-center justify-center gap-1">
                      <FiX /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search & Invite (Team Leaders Only) */}
        {isTeamLeader && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-bold text-gray-800 mb-3">Invite Members</h3>
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                placeholder="Search by name or phone..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                onClick={handleSearch}
                disabled={searchLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm"
              >
                Search
              </button>
            </div>
            
            {searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map(worker => (
                  <div key={worker._id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                    <div>
                      <div className="font-semibold text-gray-800">{worker.name}</div>
                      <div className="text-xs text-gray-500">{worker.workerType === 'TEAM_LEADER' ? 'Team Leader' : 'Independent Worker'} ? {worker.phone}</div>
                    </div>
                    <button 
                      onClick={() => sendRequest(worker._id, worker.workerType === 'TEAM_LEADER' ? 'MERGE_TEAM' : 'JOIN_WORKER')}
                      className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-medium"
                    >
                      {worker.workerType === 'TEAM_LEADER' ? 'Merge' : 'Invite'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm">
                <FiUsers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No workers available right now.</p>
                <p className="text-xs opacity-70">Try searching for a specific name or phone number.</p>
              </div>
            )}
          </div>
        )}

        {/* Team Members List */}
        {team && isTeamLeader && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">Team Members ({members.length})</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {members.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">No members yet</div>
              ) : (
                members.map(member => (
                  <div key={member._id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-800">{member.name}</div>
                      <div className="text-sm text-gray-500">{member.phone}</div>
                    </div>
                    <button 
                      onClick={() => removeMember(member._id)}
                      className="text-red-500 p-2 hover:bg-red-50 rounded-full"
                    >
                      <FiUserX />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Leader Info (For Workers) */}
        {team && !isTeamLeader && leader && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">Team Leader</h3>
            </div>
            <div className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                <FiUser size={24} />
              </div>
              <div>
                <div className="font-semibold text-gray-800">{leader.name}</div>
                <div className="text-sm text-gray-500">{leader.phone}</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default WorkerTeam;
