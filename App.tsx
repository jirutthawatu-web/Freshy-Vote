import React, { useEffect, useState } from 'react';
import Header from './components/Header';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import ContestantCard from './components/ContestantCard';
import { AppState, Contestant, User } from './types';
import { 
  getContestants, 
  getUserVoteStatus, 
  castVote,
  getSystemConfig,
  saveSystemConfig,
  addContestantToApi,
  removeContestantFromApi,
  resetData
} from './services/storage';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    contestants: [],
    currentUser: null,
    bannerUrl: '',
    voteDeadline: null,
  });

  const [isAdminView, setIsAdminView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // For forcing re-fetch

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        const contestants = await getContestants();
        const config = await getSystemConfig();
        
        setState(prev => ({
            ...prev,
            contestants,
            bannerUrl: config.bannerUrl,
            voteDeadline: config.voteDeadline,
        }));
        
        // Refresh user status if logged in
        if (state.currentUser) {
            const status = await getUserVoteStatus(state.currentUser.email);
            setState(prev => ({
                ...prev,
                currentUser: {
                    ...prev.currentUser!,
                    hasVoted: status.hasVoted,
                    votedForId: status.votedForId
                }
            }));
        }
        setLoading(false);
    };
    loadData();
  }, [refreshKey, state.currentUser?.email]);

  const handleLogin = async (email: string) => {
    setLoading(true);
    const status = await getUserVoteStatus(email);
    
    // Determine admin status based on email
    const isAdmin = email === 'jirutthawat.u@ditc.co.th';

    const newUser: User = {
      email,
      isAdmin: isAdmin,
      hasVoted: status.hasVoted,
      votedForId: status.votedForId
    };
    setState(prev => ({ ...prev, currentUser: newUser }));
    
    // Reset admin view if not admin
    if (!isAdmin) {
        setIsAdminView(false);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, currentUser: null }));
    setIsAdminView(false);
  };

  const handleVote = async (contestantId: string) => {
    if (!state.currentUser) return;
    
    // Final client-side check for deadline
    if (state.voteDeadline && new Date() > new Date(state.voteDeadline)) {
        alert("หมดเวลาโหวตแล้วครับ");
        setRefreshKey(k => k + 1); // Refresh to update UI state
        return;
    }

    setLoading(true);
    const success = await castVote(state.currentUser.email, contestantId);
    if (success) {
      setRefreshKey(k => k + 1); // Trigger reload
    } else {
      setLoading(false);
    }
  };

  const handleAddContestant = async (newC: Omit<Contestant, 'id' | 'votes'>) => {
    setLoading(true);
    const id = Date.now().toString();
    const contestant: Contestant = {
      ...newC,
      id,
      votes: 0
    };
    await addContestantToApi(contestant);
    setRefreshKey(k => k + 1);
  };

  const handleRemoveContestant = async (id: string) => {
    if(!window.confirm("ยืนยันการลบผู้เข้าประกวด?")) return;
    setLoading(true);
    await removeContestantFromApi(id);
    setRefreshKey(k => k + 1);
  };

  const handleUpdateConfig = async (bannerUrl: string, voteDeadline: string | null) => {
    setLoading(true);
    await saveSystemConfig(bannerUrl, voteDeadline);
    setRefreshKey(k => k + 1);
  };
  
  const handleReset = async () => {
      if(window.confirm("คุณแน่ใจหรือไม่ที่จะลบข้อมูลทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้")) {
          setLoading(true);
          await resetData();
          window.location.reload();
      }
  }

  if (loading && !state.contestants.length && !state.currentUser) return (
    <div className="flex h-screen items-center justify-center flex-col gap-4">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
    </div>
  );

  // Render Login Screen if not authenticated
  if (!state.currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // Calculate total votes for percentage visualization
  const totalVotes = state.contestants.reduce((sum, c) => sum + c.votes, 0);

  // Check if voting is closed
  const isVotingClosed = state.voteDeadline ? new Date() > new Date(state.voteDeadline) : false;

  // Show votes if: User has voted OR User is Admin OR Voting is closed
  const shouldShowVotes = state.currentUser.hasVoted || state.currentUser.isAdmin || isVotingClosed;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header 
        bannerUrl={state.bannerUrl} 
        user={state.currentUser}
        onLogout={handleLogout}
        onToggleAdmin={() => setIsAdminView(!isAdminView)}
        showAdmin={isAdminView}
      />
      
      {loading && (
          <div className="fixed top-0 left-0 w-full h-1 bg-indigo-100 z-50">
              <div className="h-full bg-indigo-600 animate-pulse w-full"></div>
          </div>
      )}

      {isAdminView && state.currentUser.isAdmin ? (
        <AdminPanel 
          contestants={state.contestants}
          bannerUrl={state.bannerUrl}
          voteDeadline={state.voteDeadline}
          onAddContestant={handleAddContestant}
          onRemoveContestant={handleRemoveContestant}
          onUpdateConfig={handleUpdateConfig}
          onReset={handleReset}
        />
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-10">
            {isVotingClosed && (
                <div className="mb-6 bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">ประกาศ: </strong>
                    <span className="block sm:inline">หมดเวลาการโหวตแล้ว ขอบคุณทุกคะแนนเสียง</span>
                </div>
            )}

            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              ผู้เข้าประกวดทั้งหมด
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
              {state.currentUser.hasVoted 
                ? "ขอบคุณที่ร่วมโหวต! ผลคะแนนปัจจุบันแสดงด้านล่าง" 
                : isVotingClosed 
                    ? "สรุปผลคะแนนการประกวด"
                    : "กรุณาเลือกผู้เข้าประกวดที่คุณชื่นชอบ (สิทธิ์: 1 โหวตเท่านั้น)"}
            </p>
            {state.voteDeadline && !isVotingClosed && (
                <p className="text-sm text-indigo-600 mt-2 font-medium">
                    ปิดรับโหวต: {new Date(state.voteDeadline).toLocaleString('th-TH')}
                </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {state.contestants.map(contestant => (
              <ContestantCard
                key={contestant.id}
                contestant={contestant}
                onVote={handleVote}
                disabled={state.currentUser?.hasVoted || isVotingClosed || false}
                isVotedFor={state.currentUser?.votedForId === contestant.id}
                totalVotes={totalVotes}
                isVotingClosed={isVotingClosed}
                showVotes={shouldShowVotes}
              />
            ))}
          </div>
          
          {state.contestants.length === 0 && (
             <div className="text-center py-20 text-gray-400 border-2 border-dashed rounded-lg">
                 ยังไม่มีผู้เข้าประกวดในระบบ
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;