import React from 'react';
import { User } from '../types';
import { LogOut, LayoutDashboard, Vote } from 'lucide-react';

interface HeaderProps {
  bannerUrl: string;
  user: User | null;
  onLogout: () => void;
  onToggleAdmin: () => void;
  showAdmin: boolean;
}

const Header: React.FC<HeaderProps> = ({ bannerUrl, user, onLogout, onToggleAdmin, showAdmin }) => {
  return (
    <div className="w-full bg-white shadow-md relative">
      {/* Banner Image */}
      <div className="w-full h-48 md:h-64 overflow-hidden relative group">
        <img 
          src={bannerUrl} 
          alt="Contest Banner" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg tracking-wider">
                VOTE FOR THE STAR
            </h1>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 text-white p-2 rounded-lg">
                <Vote size={24} />
            </div>
            <div>
                <h2 className="text-xl font-bold text-gray-800">VoteHub</h2>
                {user && <p className="text-xs text-gray-500">Login: {user.email}</p>}
            </div>
        </div>

        {user && (
          <div className="flex items-center space-x-4">
            {user.isAdmin && (
              <button
                onClick={onToggleAdmin}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                  showAdmin 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <LayoutDashboard size={20} />
                <span className="hidden sm:inline">
                  {showAdmin ? 'ไปหน้าโหวต' : 'จัดการระบบ'}
                </span>
              </button>
            )}
            
            <button
              onClick={onLogout}
              className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <LogOut size={20} />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;