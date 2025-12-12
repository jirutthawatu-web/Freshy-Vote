import React, { useState } from 'react';

interface LoginProps {
  onLogin: (email: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [step, setStep] = useState<'button' | 'input'>('button');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleGoogleClick = () => {
    setStep('input');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
        setError('กรุณากรอกอีเมล');
        return;
    }
    
    // Check for valid email format and Domain Restriction
    const isGmail = cleanEmail.endsWith('@gmail.com');
    // Admin email whitelist
    const isAdmin = cleanEmail === 'jirutthawat.u@ditc.co.th';

    if (!isGmail && !isAdmin) {
         setError('ขออภัย ระบบเปิดรับโหวตเฉพาะบัญชี Gmail (@gmail.com) เท่านั้น');
         return;
    }

    onLogin(cleanEmail);
  };

  const GoogleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5] px-4 font-sans">
        {step === 'button' ? (
             <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-sm w-full border border-gray-100">
                <div className="mb-6 flex justify-center">
                    <div className="p-3 bg-indigo-50 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><path d="m9 12 2 2 4-4"/><path d="M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H5V7Z"/><path d="M22 19H2"/></svg>
                    </div>
                </div>
                <h1 className="text-2xl font-bold mb-2 text-gray-800">VoteHub</h1>
                <p className="text-gray-600 mb-8">ระบบโหวตผู้เข้าประกวดออนไลน์</p>
                
                <button
                    onClick={handleGoogleClick}
                    className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:shadow-md font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-3"
                >
                    <GoogleIcon className="w-6 h-6" />
                    <span className="text-base">เข้าสู่ระบบด้วย Google</span>
                </button>
                <p className="mt-6 text-xs text-gray-400">
                    เพื่อยืนยันตัวตน กรุณาใช้อีเมล @gmail.com เท่านั้น
                </p>
             </div>
        ) : (
            // Simulated Google Login Form
            <div className="bg-white p-8 sm:p-10 rounded-xl shadow-md max-w-[450px] w-full border border-gray-200">
                <div className="flex justify-center mb-6">
                    <GoogleIcon className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-medium text-center text-gray-900 mb-2">ลงชื่อเข้าใช้</h2>
                <p className="text-base text-center text-gray-800 mb-8">เพื่อดำเนินการต่อใน VoteHub</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <div className="relative group">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setError('');
                                }}
                                className={`peer w-full border rounded px-3 pt-5 pb-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-transparent transition-all ${error ? 'border-red-500' : 'border-gray-300'}`}
                                id="email"
                                placeholder="อีเมล"
                                autoFocus
                            />
                             <label 
                                htmlFor="email"
                                className="absolute left-3 top-1 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-gray-400 peer-focus:top-1 peer-focus:text-xs peer-focus:text-blue-600 bg-white px-1 pointer-events-none"
                            >
                                อีเมล (Gmail เท่านั้น)
                            </label>
                        </div>
                        {error && (
                            <div className="flex items-start mt-2 text-sm text-red-600">
                                <svg className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    <div className="text-sm text-gray-600">
                        ไม่ใช่คอมพิวเตอร์ของคุณใช่ไหม ให้ใช้โหมดผู้มาเยือนเพื่อลงชื่อเข้าใช้แบบส่วนตัว
                    </div>

                    <div className="flex justify-between items-center pt-8">
                        <button 
                            type="button" 
                            onClick={() => setStep('button')}
                            className="text-blue-600 font-medium hover:bg-blue-50 px-4 py-2 rounded transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            className="bg-[#1a73e8] text-white font-medium px-6 py-2 rounded hover:bg-[#1557b0] transition-colors shadow-sm"
                        >
                            ถัดไป
                        </button>
                    </div>
                </form>
            </div>
        )}
    </div>
  );
};

export default Login;