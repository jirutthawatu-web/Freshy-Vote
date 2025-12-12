import React from 'react';
import { Contestant } from '../types';
import { Heart, Check, Clock, Lock, Building2 } from 'lucide-react';

interface ContestantCardProps {
  contestant: Contestant;
  onVote: (id: string) => void;
  disabled: boolean;
  isVotedFor: boolean;
  totalVotes: number;
  isVotingClosed?: boolean;
  showVotes: boolean;
}

const ContestantCard: React.FC<ContestantCardProps> = ({ 
  contestant, 
  onVote, 
  disabled, 
  isVotedFor,
  totalVotes,
  isVotingClosed = false,
  showVotes
}) => {
  // Simple calculation for a progress bar visual
  const percentage = totalVotes > 0 ? (contestant.votes / totalVotes) * 100 : 0;

  return (
    <div className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform ${isVotedFor ? 'ring-2 ring-green-500 scale-105' : ''}`}>
      <div className="relative h-64 overflow-hidden">
        <img
          src={contestant.imageUrl}
          alt={contestant.name}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
        />
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-lg font-bold text-indigo-600 shadow-sm">
          No. {contestant.number}
        </div>
        {isVotedFor && (
            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                <span className="bg-green-600 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg">
                    <Check size={20} /> โหวตแล้ว
                </span>
            </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{contestant.name}</h3>
        
        {/* Department / Company Badge */}
        <div className="flex items-center gap-2 mb-4 text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg w-fit">
             <Building2 size={16} className="shrink-0" />
             <span className="text-sm font-medium line-clamp-1">
                {contestant.department || 'ไม่ระบุสังกัด'}
             </span>
        </div>
        
        {showVotes ? (
          <>
            <div className="flex items-center justify-between mb-4">
                <div className="text-2xl font-bold text-indigo-600">
                    {contestant.votes} <span className="text-sm text-gray-400 font-normal">คะแนน</span>
                </div>
                <div className="text-xs text-gray-400">
                    {percentage.toFixed(1)}%
                </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-100 rounded-full h-2 mb-6">
                <div 
                    className="bg-indigo-500 h-2 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center mb-6 h-20 bg-gray-50 rounded-lg border border-dashed border-gray-200 gap-1">
             <Lock size={16} className="text-gray-400" />
             <span className="text-gray-400 text-sm font-medium">โหวตเพื่อดูคะแนน</span>
          </div>
        )}

        <button
          onClick={() => onVote(contestant.id)}
          disabled={disabled}
          className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 
            ${disabled 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:transform active:scale-95 shadow-md hover:shadow-lg'
            }`}
        >
          {isVotedFor ? (
            <>
                <Check size={20} />
                <span>คุณโหวตให้เบอร์นี้แล้ว</span>
            </>
          ) : isVotingClosed ? (
            <>
                <Clock size={20} />
                <span>ปิดรับโหวตแล้ว</span>
            </>
          ) : disabled ? (
            <>
                <Heart size={20} />
                <span>ใช้สิทธิ์โหวตไปแล้ว</span>
            </>
          ) : (
            <>
                <Heart size={20} className="fill-current" />
                <span>โหวตให้เบอร์นี้</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ContestantCard;