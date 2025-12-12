import React, { useState } from 'react';
import { Contestant } from '../types';
import { Plus, Trash2, Download, Save, Sparkles, Database, Copy, Clock } from 'lucide-react';
import { analyzeResults } from '../services/geminiService';
import { getApiUrl, saveApiUrl } from '../services/storage';

interface AdminPanelProps {
  contestants: Contestant[];
  bannerUrl: string;
  voteDeadline: string | null;
  onAddContestant: (c: Omit<Contestant, 'id' | 'votes'>) => void;
  onRemoveContestant: (id: string) => void;
  onUpdateConfig: (bannerUrl: string, voteDeadline: string | null) => void;
  onReset: () => void;
}

const GAS_CODE = `
// ==========================================
// สคริปต์เชื่อมต่อ VoteHub กับ Google Sheets (v3 - Added Department)
// ==========================================
// 1. ไปที่ sheet.new เพื่อสร้าง Google Sheet ใหม่
// 2. ไปที่เมนู Extensions (ส่วนขยาย) > Apps Script
// 3. ลบโค้ดเก่าทิ้งให้หมด แล้ววางโค้ดนี้ลงไปแทน
// 4. กดปุ่ม Deploy (การทำให้ใช้งานได้) > New deployment (การทำให้ใช้งานได้รายการใหม่)
// 5. คลิกรูปฟันเฟืองด้านซ้าย > เลือก Web app
// 6. ตั้งค่าดังนี้:
//    - Description: VoteHub API v3
//    - Execute as: Me (ฉัน)
//    - Who has access: Anyone (ทุกคน)
// 7. กด Deploy > Copy URL

function doGet(e) {
  return handleRequest('getContestants', {});
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    return handleRequest(data.action, data);
  } catch (err) {
    return createResponse({ success: false, message: "Invalid JSON: " + err.toString() });
  }
}

function handleRequest(action, data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dbSheet = getOrCreateSheet(ss, 'Contestants');
  const voteSheet = getOrCreateSheet(ss, 'Votes');
  const configSheet = getOrCreateSheet(ss, 'Config');
  
  let result = { success: true, data: null };
  
  try {
    const lock = LockService.getScriptLock();
    if (lock.tryLock(10000)) {
      
      if (action === 'getContestants') {
        const rows = dbSheet.getDataRange().getValues();
        rows.shift(); // Remove header
        // Cols: 0=ID, 1=Number, 2=Name, 3=Department, 4=Image, 5=Votes
        const contestants = rows.map(r => ({
          id: String(r[0]), 
          number: String(r[1]), 
          name: String(r[2]), 
          department: String(r[3] || ''),
          imageUrl: String(r[4]), 
          votes: parseInt(r[5] || 0)
        })).filter(c => c.id && c.id !== "");
        result.data = contestants;
      }
      
      else if (action === 'addContestant') {
        const c = data.contestant;
        // Cols: ID, Number, Name, Department, Image, Votes
        dbSheet.appendRow([c.id, "'" + c.number, c.name, c.department, c.imageUrl, 0]);
      }
      
      else if (action === 'removeContestant') {
        const id = data.id;
        const rows = dbSheet.getDataRange().getValues();
        for(let i=0; i<rows.length; i++) {
          if(String(rows[i][0]) === String(id)) {
             dbSheet.deleteRow(i+1);
             break;
          }
        }
      }
      
      else if (action === 'vote') {
        // Check deadline first
        const deadline = configSheet.getRange("B1").getValue();
        if (deadline && new Date() > new Date(deadline)) {
            throw new Error("หมดเวลาโหวตแล้ว");
        }

        const email = data.email;
        const cId = data.contestantId;
        const votes = voteSheet.getDataRange().getValues();
        const hasVoted = votes.slice(1).some(r => String(r[0]) === String(email));
        
        if(hasVoted) throw new Error("คุณใช้สิทธิ์โหวตไปแล้ว");
        
        voteSheet.appendRow([email, cId, new Date()]);
        
        // Update total
        const rows = dbSheet.getDataRange().getValues();
        for(let i=1; i<rows.length; i++) {
          if(String(rows[i][0]) === String(cId)) {
            // Vote count is now at column index 5 (6th column: F)
            const current = parseInt(rows[i][5] || 0);
            dbSheet.getRange(i+1, 6).setValue(current + 1);
            break;
          }
        }
      }
      
      else if (action === 'getUserStatus') {
        const email = data.email;
        const votes = voteSheet.getDataRange().getValues();
        const voteRec = votes.slice(1).find(r => String(r[0]) === String(email));
        result.data = {
          hasVoted: !!voteRec,
          votedForId: voteRec ? String(voteRec[1]) : undefined
        };
      }
      
      else if (action === 'getSystemConfig') {
         // A1 = Banner URL, B1 = Vote Deadline (ISO String)
         result.data = {
             bannerUrl: configSheet.getRange("A1").getValue(),
             voteDeadline: configSheet.getRange("B1").getValue()
         };
      }
      
      else if (action === 'saveSystemConfig') {
         configSheet.getRange("A1").setValue(data.bannerUrl);
         configSheet.getRange("B1").setValue(data.voteDeadline);
      }
  
      else if (action === 'reset') {
         dbSheet.clearContents();
         dbSheet.appendRow(['ID', 'Number', 'Name', 'Department', 'Image', 'Votes']);
         voteSheet.clearContents();
         voteSheet.appendRow(['Email', 'ContestantID', 'Timestamp']);
      }
      
      lock.releaseLock();
    } else {
      throw new Error("Server is busy, please try again.");
    }
    
  } catch (e) {
    result.success = false;
    result.message = e.toString();
  }
  
  return createResponse(result);
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if(name === 'Contestants') sheet.appendRow(['ID', 'Number', 'Name', 'Department', 'Image', 'Votes']);
    if(name === 'Votes') sheet.appendRow(['Email', 'ContestantID', 'Timestamp']);
  }
  return sheet;
}
`;

const AdminPanel: React.FC<AdminPanelProps> = ({
  contestants,
  bannerUrl,
  voteDeadline,
  onAddContestant,
  onRemoveContestant,
  onUpdateConfig,
  onReset
}) => {
  const [newNumber, setNewNumber] = useState('');
  const [newName, setNewName] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newImage, setNewImage] = useState('');
  
  const [editBanner, setEditBanner] = useState(bannerUrl);
  const [editDeadline, setEditDeadline] = useState(voteDeadline || '');

  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // API Config State
  const [apiUrl, setApiUrlState] = useState(getApiUrl());
  const [showScript, setShowScript] = useState(false);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNumber || !newName) return;
    
    const img = newImage || `https://picsum.photos/seed/${newNumber}/400/600`;
    
    onAddContestant({
      number: newNumber,
      name: newName,
      department: newDepartment || 'ทั่วไป',
      imageUrl: img,
    });

    setNewNumber('');
    setNewName('');
    setNewDepartment('');
    setNewImage('');
  };

  const handleSaveConfig = () => {
    // If clearing date
    const finalDeadline = editDeadline ? editDeadline : null;
    onUpdateConfig(editBanner, finalDeadline);
  };

  const handleSaveApi = () => {
      saveApiUrl(apiUrl);
      alert("บันทึกการเชื่อมต่อเรียบร้อย! ระบบจะรีโหลดเพื่อเริ่มใช้งาน Database ใหม่");
      window.location.reload();
  };

  const handleCopyScript = () => {
      navigator.clipboard.writeText(GAS_CODE);
      alert("คัดลอกโค้ดแล้ว นำไปวางใน Google Apps Script ได้เลย (อย่าลืม Deploy ใหม่นะครับ)");
  };

  const handleAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysis('');
    const result = await analyzeResults(contestants);
    setAnalysis(result);
    setIsAnalyzing(false);
  };
  
  const handleExportCSV = () => {
    const headers = ['ID', 'Number', 'Name', 'Department', 'Votes'];
    const csvContent = [
      headers.join(','),
      ...contestants.map(c => `${c.id},"${c.number}","${c.name}","${c.department}",${c.votes}`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'vote_results.csv';
    link.click();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <LayoutDashboardIcon />
            แผงควบคุมผู้ดูแลระบบ
          </h2>
          <div className="flex gap-4">
            <button 
                onClick={() => setShowScript(!showScript)}
                className="text-indigo-600 text-sm hover:underline"
            >
                {showScript ? 'ซ่อนการตั้งค่า Database' : 'ตั้งค่า Database (Google Sheets)'}
            </button>
            <button 
                onClick={onReset}
                className="text-red-500 text-sm underline hover:text-red-700"
            >
                รีเซ็ตข้อมูลทั้งหมด
            </button>
          </div>
      </div>

      {/* Database Configuration Section */}
      {showScript && (
          <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-200 shadow-inner">
             <div className="mb-6">
                <h3 className="text-lg font-bold text-indigo-900 mb-2 flex items-center gap-2">
                    <Database size={20} />
                    เชื่อมต่อ Google Sheets (ฟรี)
                </h3>
                <p className="text-sm text-indigo-700 mb-4">
                    เพื่อใช้งานแบบออนไลน์และแชร์ข้อมูลกันได้ คุณต้องสร้าง Google Apps Script เพื่อเป็นตัวกลางบันทึกข้อมูล
                </p>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={apiUrl}
                        onChange={(e) => setApiUrlState(e.target.value)}
                        placeholder="วาง URL ของ Web App ที่ได้จาก Google Apps Script ที่นี่..."
                        className="flex-1 border border-indigo-300 rounded px-3 py-2"
                    />
                    <button onClick={handleSaveApi} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 whitespace-nowrap">
                        บันทึก URL
                    </button>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                    สถานะปัจจุบัน: {getApiUrl() ? <span className="text-green-600 font-bold">เชื่อมต่อแล้ว ✅</span> : <span className="text-orange-500 font-bold">ใช้งานโหมดออฟไลน์ (Local) ⚠️</span>}
                </div>
             </div>
             
             <div className="bg-white p-4 rounded border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-700">โค้ดสำหรับ Google Apps Script (เวอร์ชั่น 3)</span>
                    <button onClick={handleCopyScript} className="text-xs flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded">
                        <Copy size={12} /> คัดลอกโค้ด
                    </button>
                </div>
                <div className="mb-2 text-xs text-gray-500 bg-yellow-50 p-2 rounded border border-yellow-100">
                    <strong>คำเตือน:</strong> เนื่องจากมีการเพิ่มข้อมูลใหม่ (ฝ่าย/บริษัท) <span className="text-red-600 font-bold">คุณจำเป็นต้องอัปเดตโค้ดนี้ใน Apps Script และกด Reset Data หนึ่งครั้ง</span> เพื่อให้ตารางสร้างคอลัมน์ใหม่ได้ถูกต้อง
                </div>
                <textarea 
                    readOnly 
                    value={GAS_CODE}
                    className="w-full h-64 font-mono text-xs p-2 bg-gray-50 border border-gray-200 rounded text-gray-600 focus:outline-none"
                    onClick={(e) => e.currentTarget.select()}
                />
             </div>
          </div>
      )}

      {/* General Settings (Banner & Deadline) */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Save size={20} className="text-indigo-600"/> 
            ตั้งค่าทั่วไป (System Config)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ลิงก์รูปแบนเนอร์ (Header Image)</label>
                <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={editBanner}
                    onChange={(e) => setEditBanner(e.target.value)}
                    placeholder="https://..."
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Clock size={16} /> กำหนดเวลาปิดโหวต (Vote Deadline)
                </label>
                <div className="flex gap-2">
                    <input
                        type="datetime-local"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        value={editDeadline || ''}
                        onChange={(e) => setEditDeadline(e.target.value)}
                    />
                    <button 
                        onClick={() => setEditDeadline('')}
                        className="text-gray-400 hover:text-red-500 px-2 text-sm"
                        title="เคลียร์เวลา (เปิดโหวตตลอด)"
                    >
                        เคลียร์
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                    *หากไม่กำหนด จะสามารถโหวตได้ตลอดเวลา
                </p>
            </div>
        </div>
        <div className="mt-6 flex justify-end">
             <button
                onClick={handleSaveConfig}
                className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 flex items-center gap-2"
            >
                <Save size={18} />
                บันทึกการตั้งค่า
            </button>
        </div>
      </div>

      {/* Add Contestant */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">เพิ่มผู้เข้าประกวด</h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">หมายเลข</label>
            <input
              type="text"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              placeholder="01"
            />
          </div>
          <div className="col-span-1 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
            <input
              type="text"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="สมศรี มีสุข"
            />
          </div>
          <div className="col-span-1 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">ฝ่าย/บริษัท</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={newDepartment}
              onChange={(e) => setNewDepartment(e.target.value)}
              placeholder="การตลาด / บจก. ABC"
            />
          </div>
          <div className="col-span-1 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">รูปภาพ (URL)</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              value={newImage}
              onChange={(e) => setNewImage(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center justify-center gap-2 h-[42px]"
          >
            <Plus size={18} />
            เพิ่ม
          </button>
        </form>
      </div>

      {/* Analytics & Export */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gemini Analysis */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-lg shadow-sm border border-indigo-100">
             <div className="flex justify-between items-start mb-4">
                 <h3 className="text-lg font-medium text-indigo-900 flex items-center gap-2">
                    <Sparkles className="text-yellow-500" size={20} />
                    AI วิเคราะห์ผลโหวต
                 </h3>
                 <button 
                    onClick={handleAnalysis}
                    disabled={isAnalyzing}
                    className="text-xs bg-white text-indigo-600 border border-indigo-200 px-3 py-1 rounded-full hover:bg-indigo-50 disabled:opacity-50"
                 >
                    {isAnalyzing ? 'กำลังวิเคราะห์...' : 'เริ่มวิเคราะห์'}
                 </button>
             </div>
             <div className="bg-white/80 p-4 rounded-md min-h-[100px] text-gray-700 text-sm leading-relaxed">
                 {analysis ? analysis : (isAnalyzing ? "กำลังประมวลผล..." : "กดปุ่มเพื่อเริ่มให้ AI สรุปผลการแข่งขันปัจจุบัน")}
             </div>
          </div>

          {/* Data Table */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">รายการคะแนนปัจจุบัน</h3>
                <button
                    onClick={handleExportCSV}
                    className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-sm font-medium"
                >
                    <Download size={16} />
                    Export CSV
                </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dept.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Votes</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {contestants.sort((a,b) => b.votes - a.votes).map((contestant) => (
                    <tr key={contestant.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{contestant.number}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contestant.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contestant.department}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{contestant.votes}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                            onClick={() => onRemoveContestant(contestant.id)}
                            className="text-red-600 hover:text-red-900"
                        >
                            <Trash2 size={18} />
                        </button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
          </div>
      </div>
    </div>
  );
};

const LayoutDashboardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
);

export default AdminPanel;