import { Contestant, User } from '../types';

const KEYS = {
  CONTESTANTS: 'votehub_contestants',
  USERS: 'votehub_users',
  BANNER: 'votehub_banner',
  VOTE_DEADLINE: 'votehub_deadline',
  API_URL: 'votehub_api_url'
};

// Default API URL provided by user
const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbxvmIJKRhOikKZU7V0-L_07R1O3_zgl5N97ZUVNQbp5ejE2CBtFN7YQTpyy22Jy0wcMkg/exec';

// Initial mock data
const INITIAL_CONTESTANTS: Contestant[] = [
  {
    id: '1',
    number: '01',
    name: 'สมชาย ใจดี',
    department: 'แผนก IT / บริษัท เทควัน',
    imageUrl: 'https://picsum.photos/seed/p1/400/600',
    votes: 12,
  },
  {
    id: '2',
    number: '02',
    name: 'มารี สวยงาม',
    department: 'ฝ่ายการตลาด (สนง.ใหญ่)',
    imageUrl: 'https://picsum.photos/seed/p2/400/600',
    votes: 25,
  },
  {
    id: '3',
    number: '03',
    name: 'กานดา น่ารัก',
    department: 'บจก. เอแอนด์บี กรุ๊ป',
    imageUrl: 'https://picsum.photos/seed/p3/400/600',
    votes: 8,
  },
];

const DEFAULT_BANNER = 'https://picsum.photos/id/20/1200/400';

// API Configuration
export const getApiUrl = (): string => localStorage.getItem(KEYS.API_URL) || DEFAULT_API_URL;
export const saveApiUrl = (url: string) => localStorage.setItem(KEYS.API_URL, url);

// Helper for API calls
const apiRequest = async (action: string, payload: any = {}) => {
  const url = getApiUrl();
  if (!url) throw new Error("No API URL configured");

  try {
    const response = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload })
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.message || 'API Error');
    return result;
  } catch (error) {
    console.error(`API Error (${action}):`, error);
    throw error;
  }
};

export const getContestants = async (): Promise<Contestant[]> => {
  const url = getApiUrl();
  if (url) {
    try {
      const res = await apiRequest('getContestants');
      return res.data;
    } catch (e) {
      console.warn("Falling back to local storage due to API error");
    }
  }

  // Local Storage Fallback
  const data = localStorage.getItem(KEYS.CONTESTANTS);
  return data ? JSON.parse(data) : INITIAL_CONTESTANTS;
};

export const saveContestants = async (contestants: Contestant[]) => {
  const url = getApiUrl();
  if (!url) {
    localStorage.setItem(KEYS.CONTESTANTS, JSON.stringify(contestants));
  }
};

export const addContestantToApi = async (contestant: Contestant) => {
    const url = getApiUrl();
    if (url) {
        await apiRequest('addContestant', { contestant });
    } else {
        const current = await getContestants();
        saveContestants([...current, contestant]);
    }
}

export const removeContestantFromApi = async (id: string) => {
    const url = getApiUrl();
    if (url) {
        await apiRequest('removeContestant', { id });
    } else {
        const current = await getContestants();
        saveContestants(current.filter(c => c.id !== id));
    }
}

// Combined Config Getter (Banner + Deadline)
export const getSystemConfig = async (): Promise<{ bannerUrl: string; voteDeadline: string | null }> => {
  const url = getApiUrl();
  if (url) {
    try {
      const res = await apiRequest('getSystemConfig');
      return {
          bannerUrl: res.data.bannerUrl || DEFAULT_BANNER,
          voteDeadline: res.data.voteDeadline || null
      };
    } catch (e) {
        console.warn("API Config fetch failed");
    }
  }
  return {
      bannerUrl: localStorage.getItem(KEYS.BANNER) || DEFAULT_BANNER,
      voteDeadline: localStorage.getItem(KEYS.VOTE_DEADLINE)
  };
};

export const saveSystemConfig = async (bannerUrl: string, voteDeadline: string | null) => {
  const apiUrl = getApiUrl();
  if (apiUrl) {
    await apiRequest('saveSystemConfig', { bannerUrl, voteDeadline });
  } else {
    localStorage.setItem(KEYS.BANNER, bannerUrl);
    if (voteDeadline) {
        localStorage.setItem(KEYS.VOTE_DEADLINE, voteDeadline);
    } else {
        localStorage.removeItem(KEYS.VOTE_DEADLINE);
    }
  }
};

export const getUserVoteStatus = async (email: string): Promise<{ hasVoted: boolean; votedForId?: string }> => {
  const url = getApiUrl();
  if (url) {
    try {
      const res = await apiRequest('getUserStatus', { email });
      return res.data;
    } catch (e) {
      return { hasVoted: false };
    }
  }

  const usersData = localStorage.getItem(KEYS.USERS);
  const users = usersData ? JSON.parse(usersData) : {};
  return users[email] || { hasVoted: false };
};

export const castVote = async (email: string, contestantId: string): Promise<boolean> => {
  const url = getApiUrl();
  if (url) {
    try {
      await apiRequest('vote', { email, contestantId });
      return true;
    } catch (e) {
      alert("ไม่สามารถโหวตได้: " + (e instanceof Error ? e.message : 'Unknown error'));
      return false;
    }
  }

  // Local implementation
  const usersData = localStorage.getItem(KEYS.USERS);
  const users = usersData ? JSON.parse(usersData) : {};

  if (users[email]?.hasVoted) {
    return false;
  }

  users[email] = { hasVoted: true, votedForId: contestantId };
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));

  const contestants = await getContestants();
  const updatedContestants = contestants.map(c => 
    c.id === contestantId ? { ...c, votes: c.votes + 1 } : c
  );
  localStorage.setItem(KEYS.CONTESTANTS, JSON.stringify(updatedContestants));

  return true;
};

export const resetData = async () => {
    const url = getApiUrl();
    if(url) {
        await apiRequest('reset');
    } else {
        localStorage.removeItem(KEYS.CONTESTANTS);
        localStorage.removeItem(KEYS.USERS);
        localStorage.removeItem(KEYS.BANNER);
        localStorage.removeItem(KEYS.VOTE_DEADLINE);
    }
}