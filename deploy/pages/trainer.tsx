import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Send, MessageCircle, User, Brain, Settings, RotateCcw, Play, Pause, FileText, Clock, Heart, Calendar, UserCheck, History, ArrowLeft, ArrowRight } from 'lucide-react';
import { useSSEChat } from '../src/hooks/useSSEChat';

type Message = {
  id: number;
  type: 'system' | 'counselor' | 'client';
  content: string;
  timestamp: string;
  emotion?: string;
  complaint?: string;
};

export default function TrainerPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentScenario, setCurrentScenario] = useState('');
  const [sessionTime, setSessionTime] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentSession, setCurrentSession] = useState(1);
  const [reviewPreviousSessions, setReviewPreviousSessions] = useState(false);
  const [clientProfile, setClientProfile] = useState<any | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [availablePatients, setAvailablePatients] = useState<any[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);
  const patientsPerPage = 8;

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const apiBase = '';// same-origin
  const sse = useSSEChat();
  const lastUserTextRef = useRef<string>('');
  const sseIdxRef = useRef<number>(-1);
  const sseMsgIdRef = useRef<number | null>(null);
  const sendingRef = useRef<boolean>(false);

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    let interval: any;
    if (isSessionActive) {
      interval = setInterval(() => setSessionTime((prev) => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const loadPatients = async (page = 1) => {
    setIsLoadingPatients(true);
    try {
      const response = await fetch(`${apiBase}/api/patients?page=${page}&page_size=${patientsPerPage}&random_order=false`);
      const data = await response.json();
      setAvailablePatients(data.patients || []);
      setTotalPatients(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / patientsPerPage) || 1);
      setCurrentPage(page);
    } catch (e) {
      setAvailablePatients([]);
      setTotalPatients(0);
      setTotalPages(1);
    } finally {
      setIsLoadingPatients(false);
    }
  };

  const startNewSession = async (patient: any) => {
    const patientId = patient.id;
    const patientName = patient.name;
    setCurrentScenario(patientName);
    setSessionTime(0);
    setIsSessionActive(false);
    setCurrentSession(1);
    try {
      const res = await fetch(`${apiBase}/api/sessions/by_id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'create session failed');
      setSessionId(data.session_id);
      const greeting = reviewPreviousSessions
        ? '您好，医生。距离我们上次见面已经一周了，我想继续聊聊之前的话题...'
        : getInitialGreeting(patient);
      setMessages([
        { id: 1, type: 'system', content: `已开始与「${patientName}」的模拟咨询（${patient.difficulty}）`, timestamp: new Date().toLocaleTimeString() },
        { id: 2, type: 'client', content: greeting, emotion: getInitialEmotion(patient), timestamp: new Date().toLocaleTimeString() },
      ]);
      setClientProfile({
        name: patient.name,
        age: parseInt(patient.age),
        gender: patient.gender,
        occupation: patient.occupation,
        background: patient.description,
        personality: '待了解',
        symptoms: patient.symptoms,
        previousSessions: [
          { session: 1, date: '2024-08-15', summary: '初诊，主要症状为工作焦虑和失眠' },
          { session: 2, date: '2024-08-22', summary: '探讨压力来源，学习放松技巧' }
        ],
        avatar: getAvatarForPatient(patient)
      });
    } catch (e) {
      setSessionId(null);
    }
  };

  const getAvatarForPatient = (patient: any) => {
    const age = parseInt(patient.age) || 30;
    if (patient.gender === '男') {
      if (age < 18) return 'https://images.unsplash.com/photo-1566217688581-b2191944c2f9?w=100&h=100&fit=crop&crop=face';
      if (age < 30) return 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face';
      if (age < 50) return 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face';
      return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face';
    } else {
      if (age < 18) return 'https://images.unsplash.com/photo-1569407228235-f571695b87f2?w=100&h=100&fit=crop&crop=face';
      if (age < 30) return 'https://images.unsplash.com/photo-1494790108755-2616b2b5a6d4?w=100&h=100&fit=crop&crop=face';
      if (age < 50) return 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face';
      return 'https://images.unsplash.com/photo-1546456073-92b9f0a8d413?w=100&h=100&fit=crop&crop=face';
    }
  };

  const getInitialGreeting = (patient: any) => {
    const symptoms: string[] = patient.symptoms || [];
    if (symptoms.includes('焦虑') || symptoms.includes('失眠')) return '你好，医生... 我最近总是感到很焦虑，晚上睡不着觉。';
    if (symptoms.includes('抑郁') || symptoms.includes('情绪低落')) return '医生，我最近总是感到很沉丧，对什么事都提不起兴趣...';
    if (symptoms.includes('人际') || symptoms.includes('沟通') || symptoms.includes('关系')) return '医生，我想和您聊一下我最近在人际关系上遇到的问题...';
    if (symptoms.includes('压力') || symptoms.includes('工作')) return '医生，我工作压力很大，感觉快要承受不住了...';
    if (symptoms.includes('家庭') || symptoms.includes('婚姻')) return '医生，我和家人的关系最近很紧张，不知道该怎么办...';
    return '医生，我想和您聊一下我最近遇到的一些问题...';
  };

  const getInitialEmotion = (patient: any) => {
    const symptoms: string[] = patient.symptoms || [];
    for (const s of symptoms) {
      if (s.includes('焦虑') || s.includes('失眠')) return '焦虑';
      if (s.includes('抑郁') || s.includes('低落')) return '低落';
      if (s.includes('人际') || s.includes('困惑')) return '困惑';
      if (s.includes('恐惧') || s.includes('急迫')) return '紧张';
      if (s.includes('怒') || s.includes('愤')) return '愤怒';
    }
    return '紧张';
  };

  const getEmotionColor = (emotion?: string) => {
    const colors: any = {
      '焦虑': 'text-orange-400',
      '紧张': 'text-red-400',
      '担忧': 'text-yellow-400',
      '疲惫': 'text-gray-400',
      '低落': 'text-blue-400',
      '困惑': 'text-purple-400',
      '回忆': 'text-indigo-400',
      '尝试': 'text-green-400',
      '思考': 'text-teal-400',
      '平静': 'text-emerald-400'
    };
    return colors[emotion || ''] || 'text-gray-400';
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    if (!sessionId) {
      alert('请先在左侧选择病人以创建会话');
      return;
    }
    if (sendingRef.current || isTyping) return; // 防抖
    sendingRef.current = true;
    const userText = inputValue;
    lastUserTextRef.current = userText;
    const counselorMsg: Message = { id: Date.now() * 10 + 1, type: 'counselor', content: userText, timestamp: new Date().toLocaleTimeString() };
    setMessages((prev) => [...prev, counselorMsg]);
    setInputValue('');
    setIsTyping(true);
    if (!isSessionActive) setIsSessionActive(true);

    // Prepare an empty client message for streaming
    const placeholderId = Date.now() * 10 + 2;
    const placeholder: Message = { id: placeholderId, type: 'client', content: '', timestamp: new Date().toLocaleTimeString() };
    setMessages((prev) => { const idx = prev.length; sseIdxRef.current = idx; sseMsgIdRef.current = placeholderId; return [...prev, placeholder]; });
    await sse.start({
      url: `${apiBase}/api/sessions/${sessionId}/chat`,
      payload: { message: userText },
      onDelta: (delta) => { const tid = sseMsgIdRef.current; setMessages((prev) => prev.map((m) => (m.id === tid ? { ...m, content: (m.content || '') + delta } : m))); },
      onDone: () => { setIsTyping(false); sseIdxRef.current = -1; sseMsgIdRef.current = null; sendingRef.current = false; },
      onError: () => { setIsTyping(false); const tid = sseMsgIdRef.current; setMessages((prev) => prev.map((m) => (m.id === tid ? { ...m, content: '抱歉，我刚才走神了...可以再说一遍吗？' } : m))); sseIdxRef.current = -1; sseMsgIdRef.current = null; sendingRef.current = false; }
    });
  };

  const stopStreaming = () => {
    sse.stop();
    setIsTyping(false);
  };

  const retryLast = async () => {
    if (!sessionId || !lastUserTextRef.current) return;
    setIsTyping(true);
    const placeholderId = Date.now() * 10 + 3;
    const placeholder: Message = { id: placeholderId, type: 'client', content: '', timestamp: new Date().toLocaleTimeString() };
    setMessages((prev) => { sseIdxRef.current = prev.length; sseMsgIdRef.current = placeholderId; return [...prev, placeholder]; });
    await sse.start({
      url: `${apiBase}/api/sessions/${sessionId}/chat`,
      payload: { message: lastUserTextRef.current },
      onDelta: (delta) => { const tid = sseMsgIdRef.current; setMessages((prev) => prev.map((m) => (m.id === tid ? { ...m, content: (m.content || '') + delta } : m))); },
      onDone: () => { setIsTyping(false); sseIdxRef.current = -1; sseMsgIdRef.current = null; },
      onError: () => { setIsTyping(false); sseIdxRef.current = -1; sseMsgIdRef.current = null; }
    });
  };

  return (
    <div className="min-h-screen">
      {/* 顶部栏 */}
      <header className="sticky top-0 z-20 backdrop-blur bg-white/60 border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-emerald-800">心理咨询训练系统</div>
              <div className="text-xs text-emerald-600">多疗程记忆版</div>
            </div>
          </div>
          <div className="text-xs text-emerald-700 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="font-mono">{formatTime(sessionTime)}</span>
            {clientProfile && (
              <button onClick={() => setShowProfile((s) => !s)} className="ml-4 underline">
                {showProfile ? '隐藏档案' : '查看档案'}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-12 gap-6">
        {/* 左侧：患者列表与设置 */}
        <aside className="col-span-4 xl:col-span-3 space-y-4">
          <section className="rounded-2xl p-4 border border-emerald-100 bg-white/70">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-emerald-800">选择病人档案</h3>
                <p className="text-xs text-emerald-600">共 {totalPatients} 个病人</p>
              </div>
              <div className="flex gap-2">
                <button disabled={currentPage<=1} onClick={() => loadPatients(Math.max(1, currentPage-1))} className="px-2 py-1 border rounded disabled:opacity-50">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button disabled={currentPage>=totalPages} onClick={() => loadPatients(Math.min(totalPages, currentPage+1))} className="px-2 py-1 border rounded disabled:opacity-50">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 max-h-[420px] overflow-auto">
              {isLoadingPatients && <div>正在加载病人...</div>}
              {!isLoadingPatients && availablePatients.map((p) => (
                <div key={p.id} className="p-3 rounded-xl border border-emerald-100 bg-white hover:shadow transition flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium text-emerald-900 truncate">{p.case_title}</div>
                    <div className="text-xs text-gray-600 line-clamp-2">{p.description}</div>
                    <div className="mt-1 text-[10px] text-emerald-600">难度：{p.difficulty}</div>
                  </div>
                  <button className="px-3 py-1 rounded bg-emerald-500 text-white" onClick={() => startNewSession(p)}>开始</button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl p-4 border border-emerald-100 bg-white/70">
            <div className="flex items-center gap-2 mb-2">
              <History className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-800">疗程记忆</span>
            </div>
            <label className="flex items-center gap-2 text-sm text-emerald-700">
              <input type="checkbox" checked={reviewPreviousSessions} onChange={(e) => setReviewPreviousSessions(e.target.checked)} />
              回顾之前疗程内容
            </label>
          </section>

          {clientProfile && showProfile && (
            <section className="rounded-2xl p-4 border border-emerald-100 bg-white/70 space-y-3">
              <div className="flex items-center gap-3">
                <img src={clientProfile.avatar} alt={clientProfile.name} className="w-12 h-12 rounded-full object-cover border-2 border-emerald-200" />
                <div>
                  <div className="font-semibold text-emerald-800">{clientProfile.name}</div>
                  <div className="text-xs text-emerald-600">{clientProfile.age}岁 · {clientProfile.gender} · {clientProfile.occupation}</div>
                </div>
              </div>
              <div className="text-xs text-emerald-700">
                <div className="font-medium">背景</div>
                <div className="mt-1">{clientProfile.background}</div>
              </div>
              <div className="text-xs text-emerald-700">
                <div className="font-medium">主要症状</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {clientProfile.symptoms.map((s: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-red-100 text-red-600">{s}</span>
                  ))}
                </div>
              </div>
              <div className="text-xs text-emerald-700">
                <div className="font-medium">历史疗程</div>
                <div className="mt-1 space-y-1 max-h-24 overflow-auto">
                  {clientProfile.previousSessions.map((ps: any, i: number) => (
                    <div key={i} className="p-2 rounded border border-emerald-100 bg-white">
                      <div className="flex justify-between text-[10px] text-gray-500"><span>第 {ps.session} 次</span><span>{ps.date}</span></div>
                      <div className="text-[12px] text-gray-700">{ps.summary}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </aside>

        {/* 右侧：聊天区 */}
        <main className="col-span-8 xl:col-span-9 rounded-2xl border border-emerald-100 bg-white/70 flex flex-col min-h-[70vh]">
          <div className="flex-1 overflow-auto p-6">
            {messages.map((m, i) => (
              <div key={m.id + '-' + i} className="mb-4">
                <div className="text-xs text-gray-500 mb-1">{m.timestamp}</div>
                <div className={`whitespace-pre-wrap rounded-2xl px-4 py-3 border ${m.type === 'counselor' ? 'bg-blue-50 border-blue-100 text-blue-900' : m.type === 'system' ? 'bg-gray-50 border-gray-100 text-gray-700' : 'bg-emerald-50 border-emerald-100 text-emerald-900'}`}>
                  {m.content}
                </div>
                {(m.emotion || m.complaint) && (
                  <div className="text-xs mt-1 text-gray-600 flex gap-3">
                    {m.emotion && <span>情绪: {m.emotion}</span>}
                    {m.complaint && <span>主诉: {m.complaint}</span>}
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex items-center gap-2 text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.1s]"></span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]"></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 border-t border-emerald-100">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="请输入您的咨询回应..."
                className="flex-1 p-3 rounded-xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                rows={2}
              />
              <button onClick={handleSend} disabled={!inputValue.trim() || isTyping || !sessionId} className="px-4 py-2 bg-emerald-600 text-white rounded-xl disabled:opacity-50">
                <Send className="w-5 h-5" />
              </button>
              <button onClick={stopStreaming} disabled={!isTyping} className="px-3 py-2 border rounded-xl disabled:opacity-50">停止</button>
              <button onClick={retryLast} disabled={isTyping || !sessionId || !lastUserTextRef.current} className="px-3 py-2 border rounded-xl disabled:opacity-50">重试</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
