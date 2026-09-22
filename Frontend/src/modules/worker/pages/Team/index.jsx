import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiUsers, FiUserPlus, FiUserCheck, FiUserX, 
  FiCheck, FiX, FiLogOut, FiUser, FiStar, FiCalendar, FiArrowRight,
  FiPhone, FiAward, FiActivity, FiLayers
} from 'react-icons/fi';
import { workerTheme as themeColors } from '../../../../theme';
import api from '../../../../services/api';
import { toastManager } from '../../../../utils/toastManager';
import { useSocket } from '../../../../context/SocketContext';
import Header from '../../components/layout/Header';
import workerRequestService from '../../../../services/workerRequestService';

const WorkerTeam = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [leader, setLeader] = useState(null);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [groupRequestsCount, setGroupRequestsCount] = useState(0);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Current user's profile
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
        setIncomingRequests(reqRes.data.incoming || []);
        setOutgoingRequests(reqRes.data.outgoing || []);
      }

      // If TEAM_LEADER, fetch default eligible workers & pending group requests
      if (currentWorkerType === 'TEAM_LEADER') {
        try {
          const eligibleRes = await api.get('/workers/team/eligible-workers');
          if (eligibleRes.data.success) {
            setSearchResults(eligibleRes.data.workers || []);
          }
        } catch (err) {
          console.error("Failed to fetch default eligible workers", err);
        }

        try {
          const gRes = await workerRequestService.getGroupRequests();
          if (gRes.success && Array.isArray(gRes.data)) {
            const pendingCount = gRes.data.filter(r => ['pending', 'leader_accepted', 'collecting_members', 'selection_pending'].includes(r.status)).length;
            setGroupRequestsCount(pendingCount);
          }
        } catch (err) {
          console.error("Failed to fetch group requests count", err);
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
      const res = await api.get(`/workers/team/eligible-workers?query=${encodeURIComponent(searchQuery)}`);
      if (res.data.success) {
        setSearchResults(res.data.workers || []);
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
        setProfile(prev => ({ ...prev, workerType: 'TEAM_LEADER' }));
        fetchData();
      }
    } catch (error) {
      toastManager.error(error.response?.data?.message || 'Failed to upgrade');
      setLoading(false);
    }
  };

  const isOnlineStatus = (status) => {
    const s = String(status || '').toUpperCase();
    return s === 'ONLINE' || s === 'AVAILABLE' || s === 'ACTIVE';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header title="Team Management" showBack={true} />
        <div className="p-8 text-center flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold text-slate-500">Loading team information...</p>
        </div>
      </div>
    );
  }

  const isTeamLeader = profile?.workerType === 'TEAM_LEADER';
  const onlineMembersCount = members.filter(m => isOnlineStatus(m.status)).length;

  return (
    <div className="min-h-screen pb-24 bg-slate-50">
      <Header title={isTeamLeader ? "Team Management" : "My Team"} showBack={true} />

      <main className="p-4 space-y-5 max-w-2xl mx-auto">

        {/* Team Leader Quick Action: Group Booking Requests Banner */}
        {isTeamLeader && (
          <div 
            onClick={() => navigate('/worker/group-requests')}
            className="rounded-2xl p-4 cursor-pointer shadow-md active:scale-[0.99] transition-all bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white relative overflow-hidden"
          >
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
                  <FiLayers size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base tracking-tight">Group Booking Requests</h3>
                    {groupRequestsCount > 0 && (
                      <span className="px-2 py-0.5 bg-amber-400 text-slate-900 text-[10px] font-black rounded-full uppercase">
                        {groupRequestsCount} Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-blue-100 mt-0.5">
                    Manage incoming farm requests, rate negotiations & member selection
                  </p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 ml-2">
                <FiArrowRight size={16} />
              </div>
            </div>
          </div>
        )}

        {/* Team Status Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                {isTeamLeader ? 'Team Leader Roster' : 'Team Overview'}
              </span>
              <h2 className="text-xl font-black text-slate-800 mt-2">
                {team ? team.name : (isTeamLeader ? "Your Team is being setup" : "You are not in a team")}
              </h2>
            </div>
            {team && (
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400">Total Capacity</span>
                <p className="text-base font-black text-slate-800">
                  {team.memberCount} <span className="text-xs font-medium text-slate-400">/ {team.maxCapacity || 50}</span>
                </p>
              </div>
            )}
          </div>

          {team && (
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
              <div className="bg-slate-50 p-3 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Team Members</p>
                <p className="text-lg font-black text-slate-800">{members.length}</p>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl">
                <p className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Online Workers
                </p>
                <p className="text-lg font-black text-emerald-700">{onlineMembersCount}</p>
              </div>
            </div>
          )}

          {team && team.status === 'MIGRATING' && (
            <div className="mt-3 text-amber-700 font-medium text-xs bg-amber-50 p-3 rounded-xl border border-amber-200">
              Team is currently in migration. Members are being transferred to new team.
            </div>
          )}

          {!isTeamLeader && team && (
            <button 
              onClick={leaveTeam}
              className="mt-4 w-full py-2.5 bg-red-50 text-red-600 font-bold text-xs rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
            >
              <FiLogOut /> Leave Team
            </button>
          )}

          {!isTeamLeader && !team && (
            <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
              <h3 className="font-black text-blue-900 mb-1 text-sm">Want to lead farm teams?</h3>
              <p className="text-xs text-blue-700 mb-3">Upgrade to a Team Leader to start recruiting workers, accepting bulk farm bookings, and earning group leadership bonuses.</p>
              <button 
                onClick={upgradeToLeader}
                className="w-full py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-blue-700 transition-colors"
              >
                Become a Team Leader
              </button>
            </div>
          )}
        </div>

        {/* Incoming Team Requests (Join / Merge / Migration) */}
        {incomingRequests.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-blue-50/80 px-4 py-3 border-b border-blue-100 flex items-center justify-between">
              <h3 className="font-black text-blue-900 text-sm flex items-center gap-2">
                <FiUserPlus className="text-blue-600" /> Incoming Invites ({incomingRequests.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {incomingRequests.map(req => (
                <div key={req._id} className="p-4 flex flex-col gap-3">
                  <div>
                    <div className="font-bold text-slate-800 text-sm">{req.senderId?.name || 'Team Leader'}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {req.type === 'JOIN_WORKER' && `Invited you to join ${req.targetTeamId?.name}`}
                      {req.type === 'MERGE_TEAM' && `Requested to merge your team into ${req.targetTeamId?.name}`}
                      {req.type === 'MIGRATION_TRANSFER' && `Team is migrating. Please accept the transfer to ${req.targetTeamId?.name}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => acceptRequest(req._id)} className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm">
                      <FiCheck /> Accept
                    </button>
                    <button onClick={() => rejectRequest(req._id)} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-200">
                      <FiX /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Members List (With Full Profile Details & Skills) */}
        {team && isTeamLeader && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-800 text-base">Team Members ({members.length})</h3>
                <p className="text-xs text-slate-400">View skills, active status, and ratings</p>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                {onlineMembersCount} Online
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {members.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  <FiUsers className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
                  <p className="font-bold">No team members yet</p>
                  <p className="text-xs text-slate-400 mt-1">Search and invite eligible workers below to build your roster.</p>
                </div>
              ) : (
                members.map(member => {
                  const online = isOnlineStatus(member.status);
                  const skillsList = Array.isArray(member.skills) && member.skills.length > 0 
                    ? member.skills 
                    : (member.serviceCategory ? [member.serviceCategory] : []);

                  return (
                    <div key={member._id} className="p-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        
                        {/* Avatar & Online Dot */}
                        <div className="relative shrink-0">
                          {member.profilePhoto ? (
                            <img src={member.profilePhoto} alt={member.name} className="w-12 h-12 rounded-xl object-cover border border-slate-100" />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 flex items-center justify-center font-black text-base border border-blue-200/50">
                              {member.name ? member.name.charAt(0).toUpperCase() : 'W'}
                            </div>
                          )}
                          <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        </div>

                        {/* Info & Skills */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-slate-800 text-sm truncate">{member.name}</h4>
                            {member.rating ? (
                              <span className="flex items-center gap-0.5 text-[11px] font-black text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">
                                <FiStar size={10} className="fill-amber-400" /> {Number(member.rating).toFixed(1)}
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1 font-medium"><FiPhone size={11} className="text-slate-400" /> {member.phone}</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${online ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {online ? '• Online' : '• Offline'}
                            </span>
                          </div>

                          {/* Skill Tags */}
                          {skillsList.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                              {skillsList.slice(0, 4).map((skill, idx) => (
                                <span key={idx} className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200/60">
                                  {skill}
                                </span>
                              ))}
                              {skillsList.length > 4 && (
                                <span className="text-[10px] text-slate-400 font-bold">+{skillsList.length - 4} more</span>
                              )}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic mt-2">No skills listed</p>
                          )}

                          {member.dailyRate ? (
                            <p className="text-[11px] font-black text-slate-700 mt-1.5">
                              Base Rate: ₹{member.dailyRate}<span className="text-[10px] font-normal text-slate-400">/day</span>
                            </p>
                          ) : null}
                        </div>

                        {/* Remove Action */}
                        <button 
                          onClick={() => removeMember(member._id)}
                          className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors shrink-0"
                          title="Remove from Team"
                        >
                          <FiUserX size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Search & Invite Eligible Workers (Team Leaders Only) */}
        {isTeamLeader && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="mb-4">
              <h3 className="font-black text-slate-800 text-base">Recruit Eligible Workers</h3>
              <p className="text-xs text-slate-400">Search workers by name or phone and inspect their skills before inviting</p>
            </div>

            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                placeholder="Search by name or phone (min 3 chars)..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
              />
              <button 
                onClick={handleSearch}
                disabled={searchLoading}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {searchLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
            
            {searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map(worker => {
                  const online = isOnlineStatus(worker.status);
                  const skillsList = Array.isArray(worker.skills) && worker.skills.length > 0 
                    ? worker.skills 
                    : (worker.serviceCategory ? [worker.serviceCategory] : []);

                  return (
                    <div key={worker._id} className="p-3.5 border border-slate-100 rounded-xl bg-slate-50/60 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="relative shrink-0">
                          {worker.profilePhoto ? (
                            <img src={worker.profilePhoto} alt={worker.name} className="w-10 h-10 rounded-xl object-cover border border-slate-200" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center font-black text-sm">
                              {worker.name ? worker.name.charAt(0).toUpperCase() : 'W'}
                            </div>
                          )}
                          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm truncate">{worker.name}</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${worker.workerType === 'TEAM_LEADER' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {worker.workerType === 'TEAM_LEADER' ? 'Leader' : 'Worker'}
                            </span>
                            {worker.rating ? (
                              <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">
                                <FiStar size={9} className="fill-amber-400" /> {Number(worker.rating).toFixed(1)}
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                            <span>{worker.phone}</span>
                            <span>•</span>
                            <span className={online ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                              {online ? 'Online' : 'Offline'}
                            </span>
                          </div>

                          {skillsList.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {skillsList.slice(0, 3).map((s, idx) => (
                                <span key={idx} className="bg-white text-slate-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-200">
                                  {s}
                                </span>
                              ))}
                              {skillsList.length > 3 && (
                                <span className="text-[9px] text-slate-400 font-bold">+{skillsList.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>

                        <button 
                          onClick={() => sendRequest(worker._id, worker.workerType === 'TEAM_LEADER' ? 'MERGE_TEAM' : 'JOIN_WORKER')}
                          className="text-blue-700 bg-blue-100/80 hover:bg-blue-200 px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-colors"
                        >
                          {worker.workerType === 'TEAM_LEADER' ? 'Merge' : 'Invite'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                <FiUsers className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="font-bold text-slate-500">No workers available</p>
                <p className="text-slate-400 mt-0.5">Search above to find workers without teams.</p>
              </div>
            )}
          </div>
        )}

        {/* Leader Info Card (For regular Workers) */}
        {team && !isTeamLeader && leader && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-black text-slate-800 text-sm">Your Team Leader</h3>
            </div>
            <div className="p-4 flex items-center gap-3">
              <div className="relative shrink-0">
                {leader.profilePhoto ? (
                  <img src={leader.profilePhoto} alt={leader.name} className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                ) : (
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-lg">
                    {leader.name ? leader.name.charAt(0).toUpperCase() : 'L'}
                  </div>
                )}
                <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${isOnlineStatus(leader.status) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-slate-800 text-sm">{leader.name}</h4>
                  {leader.rating ? (
                    <span className="flex items-center gap-0.5 text-[10px] font-black text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">
                      <FiStar size={10} className="fill-amber-400" /> {Number(leader.rating).toFixed(1)}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{leader.phone}</p>
                {leader.skills && leader.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {leader.skills.slice(0, 3).map((sk, idx) => (
                      <span key={idx} className="bg-slate-100 text-slate-700 text-[9px] font-bold px-1.5 py-0.5 rounded">
                        {sk}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default WorkerTeam;
