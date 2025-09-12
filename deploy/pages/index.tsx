import React, { useEffect, useRef, useState } from 'react';
import { Brain, Clock, History, ArrowLeft, ArrowRight, Send, Heart, User as UserIcon, MessageCircle } from 'lucide-react';
import { useSSEChat } from '../src/hooks/useSSEChat';

type Message = { id: number; type: 'system' | 'counselor' | 'client'; content: string; timestamp: string; emotion?: string; complaint?: string };

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentScenario, setCurrentScenario] = useState('');
  const [sessionTime, setSessionTime] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentSession] = useState(1);
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
  const sse = useSSEChat();
  const lastUserTextRef = useRef<string>('');
  const sseIdxRef = useRef<number>(-1);
  const sseMsgIdRef = useRef<number | null>(null);
  const msgIdRef = useRef<number>(1);
  const nextMsgId = () => ++msgIdRef.current;
  const sendingRef = useRef<boolean>(false);

  useEffect(() => {
    let interval: any;
    if (isSessionActive) interval = setInterval(() => setSessionTime((p) => p + 1), 1000);
    return () => clearInterval(interval);
  }, [isSessionActive]);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  const getEmotionColor = (emotionRaw: string) => {
    const e = (emotionRaw || '').toLowerCase();
    // Map by synonyms (Chinese/English), but we return a tailwind color class
    if (e.includes('焦虑') || e.includes('anx')) return 'text-yellow-600';
    if (e.includes('抑郁') || e.includes('低落') || e.includes('depress')) return 'text-blue-600';
    if (e.includes('愤') || e.includes('怒') || e.includes('angry')) return 'text-red-600';
    if (e.includes('紧张') || e.includes('害怕') || e.includes('恐惧') || e.includes('fear') || e.includes('nervous')) return 'text-red-600';
    if (e.includes('困惑') || e.includes('迷茫') || e.includes('confus')) return 'text-purple-600';
    if (e.includes('高兴') || e.includes('开心') || e.includes('快乐') || e.includes('happy')) return 'text-green-600';
    if (e.includes('兴奋') || e.includes('excite')) return 'text-orange-600';
    if (e.includes('平静') || e.includes('calm') || e.includes('neutral')) return 'text-green-600';
    return 'text-gray-600';
  };

  const mapEmotionToDisplay = (raw?: string): { label: string; emoji: string } => {
    const e = (raw || '').toLowerCase();
    // Keep the label EXACTLY as AI returned to stay aligned
    if (!raw || raw === 'unknown') return { label: raw || 'unknown', emoji: '🙂' };
    if (e.includes('焦虑') || e.includes('anx')) return { label: raw, emoji: '😟' };
    if (e.includes('抑郁') || e.includes('depress') || e.includes('低落')) return { label: raw, emoji: '😔' };
    if (e.includes('愤') || e.includes('怒') || e.includes('angry')) return { label: raw, emoji: '😠' };
    if (e.includes('紧张') || e.includes('害怕') || e.includes('恐惧') || e.includes('fear') || e.includes('nervous')) return { label: raw, emoji: '😣' };
    if (e.includes('困惑') || e.includes('迷茫') || e.includes('confus')) return { label: raw, emoji: '😕' };
    if (e.includes('高兴') || e.includes('开心') || e.includes('快乐') || e.includes('happy')) return { label: raw, emoji: '🙂' };
    if (e.includes('兴奋') || e.includes('excite')) return { label: raw, emoji: '🤩' };
    if (e.includes('平静') || e.includes('calm') || e.includes('neutral')) return { label: raw, emoji: '😌' };
    return { label: raw, emoji: '🙂' };
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

  const apiBase = '';
  const loadPatients = async (page = 1) => {
    setIsLoadingPatients(true);
    try {
      const res = await fetch(`${apiBase}/api/patients?page=${page}&page_size=${patientsPerPage}&random_order=false`);
      const data = await res.json();
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

  useEffect(() => { loadPatients(); }, []);

  const startNewSession = async (patient: any) => {
    const patientId = patient.id;
    const patientName = patient.name;
    setCurrentScenario(patientName);
    setSessionTime(0);
    setIsSessionActive(false);
    try {
      const res = await fetch(`${apiBase}/api/sessions/by_id`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patient_id: patientId }) });
      const data = await res.json();
      console.log('[UI] create session by id', { status: res.status, session_id: data?.session_id, patientId });
      if (!res.ok) throw new Error(data?.error || 'create session failed');
      setSessionId(data.session_id);
      const greeting = reviewPreviousSessions ? '您好，医生。距离我们上次见面已经一周了，我想继续聊聊之前的话题...' : getInitialGreeting(patient);
      setMessages([
        { id: nextMsgId(), type: 'system', content: `已开始与「${patientName}」的模拟咨询（${patient.difficulty}）`, timestamp: new Date().toLocaleTimeString() },
        { id: nextMsgId(), type: 'client', content: greeting, emotion: getInitialEmotion(patient), timestamp: new Date().toLocaleTimeString() },
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
    } catch (_) {
      setSessionId(null);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !sessionId) return;
    if (sendingRef.current || isTyping) return; // 防抖：避免双触发
    sendingRef.current = true;
    const userText = inputValue;
    lastUserTextRef.current = userText;
    setMessages((prev) => [...prev, { id: nextMsgId(), type: 'counselor', content: userText, timestamp: new Date().toLocaleTimeString() }]);
    setInputValue('');
    setIsTyping(true);
    if (!isSessionActive) setIsSessionActive(true);

    const placeholderId = nextMsgId();
    const placeholder: Message = { id: placeholderId, type: 'client', content: '', timestamp: new Date().toLocaleTimeString() };
    setMessages((prev) => {
      const idx = prev.length;
      sseIdxRef.current = idx;
      sseMsgIdRef.current = placeholderId;
      console.log('[UI] placeholder index', idx);
      return [...prev, placeholder];
    });
    await sse.start({
      url: `${apiBase}/api/sessions/${sessionId}/chat`,
      payload: { message: userText },
      debug: true,
      onMeta: (meta) => {
        const targetId = sseMsgIdRef.current;
        const disp = mapEmotionToDisplay(meta?.emotion);
        setMessages((prev) => prev.map((m) => (m.id === targetId ? { ...m, emotion: disp.label, complaint: meta?.complaint } : m)));
      },
      onDelta: (delta) => {
        console.log('[UI] delta', delta);
        const targetId = sseMsgIdRef.current;
        setMessages((prev) => prev.map((m) => (m.id === targetId ? { ...m, content: (m.content || '') + delta } : m)));
      },
      onDone: () => { console.log('[UI] done'); setIsTyping(false); sseIdxRef.current = -1; sseMsgIdRef.current = null; sendingRef.current = false; },
      onError: (e) => { console.log('[UI] error', e); setIsTyping(false); const targetId = sseMsgIdRef.current; setMessages((prev) => prev.map((m) => (m.id === targetId ? { ...m, content: '抱歉，我刚才走神了...可以再说一遍吗？' } : m))); sseIdxRef.current = -1; sseMsgIdRef.current = null; sendingRef.current = false; }
    });
  };

  const stopStreaming = () => { sse.stop(); setIsTyping(false); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* 温和的背景装饰 */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-64 h-64 bg-emerald-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-teal-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>
      
      <div className="relative z-10 flex h-screen">
        {/* 左侧功能面板 */}
        <div className="w-96 bg-white/70 backdrop-blur-xl border-r border-emerald-200/50 shadow-xl relative">
          <div className="p-6 pb-28">
            {/* 标题区域 */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-emerald-800">心理咨询训练系统</h1>
                <p className="text-sm text-emerald-600">多疗程记忆版</p>
              </div>
            </div>

          {/* 当前会话信息 */}
            <div className="bg-gradient-to-r from-emerald-100 to-teal-100 rounded-2xl p-4 mb-6 border border-emerald-200/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-emerald-700">当前场景</span>
                <div className="flex items-center gap-2 text-emerald-600">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-mono">{formatTime(sessionTime)}</span>
                </div>
              </div>
              <h3 className="font-semibold text-emerald-800">{currentScenario || '未选择'}</h3>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  {isSessionActive ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-600">第 {currentSession} 次会话</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="text-xs text-gray-500">等待开始</span>
                    </>
                  )}
                </div>
                {clientProfile && (
                  <button
                    onClick={() => setShowProfile(!showProfile)}
                    className="text-xs text-emerald-600 hover:text-emerald-700 underline"
                  >
                    {showProfile ? '隐藏' : '查看'}档案
                  </button>
                )}
              </div>
            </div>

          {/* 来访者档案 */}
            {showProfile && clientProfile && (
              <div className="bg-white/80 rounded-2xl p-4 mb-6 border border-emerald-200/50 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <img 
                    src={clientProfile.avatar} 
                    alt={clientProfile.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-emerald-200"
                  />
                  <div>
                    <h4 className="font-semibold text-emerald-800">{clientProfile.name}</h4>
                    <p className="text-sm text-emerald-600">{clientProfile.age}岁 · {clientProfile.gender} · {clientProfile.occupation}</p>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-medium text-emerald-700">背景：</span>
                    <p className="text-emerald-600 mt-1">{clientProfile.background}</p>
                  </div>
                  <div>
                    <span className="font-medium text-emerald-700">性格特点：</span>
                    <p className="text-emerald-600 mt-1">{clientProfile.personality}</p>
                  </div>
                  <div>
                    <span className="font-medium text-emerald-700">主要症状：</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {clientProfile.symptoms.map((symptom, index) => (
                        <span key={index} className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs">
                          {symptom}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* 疗程记忆设置 */}
            <div className="bg-blue-50 rounded-2xl p-4 mb-6 border border-blue-200/50">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">疗程记忆</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reviewPreviousSessions}
                  onChange={(e) => setReviewPreviousSessions(e.target.checked)}
                  className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-blue-600">回顾之前疗程内容</span>
              </label>
              <p className="text-xs text-blue-500 mt-2">
                开启后，AI来访者会记住之前的咨询内容并继续讨论
              </p>
            </div>

          {/* 场景选择 */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-emerald-800">选择练习场景</h3>
                <span className="text-xs text-emerald-600">第 {currentPage} / {totalPages} 页 · 共 {totalPatients} 人</span>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {isLoadingPatients && (
                  <div className="text-xs text-emerald-600">加载中…</div>
                )}
                {!isLoadingPatients && availablePatients.length === 0 && (
                  <div className="text-xs text-emerald-600">暂无可用场景</div>
                )}
                {!isLoadingPatients && availablePatients.map((patient, index) => (
                  <div
                    key={patient.id}
                    onClick={() => startNewSession(patient)}
                    className="p-3 rounded-xl bg-white/60 hover:bg-white/80 border border-emerald-200/30 hover:border-emerald-300/50 cursor-pointer transition-all duration-200 hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={(patient.portrait as string) || getAvatarForPatient(patient)}
                        alt={patient.name}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-emerald-200"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-emerald-800 text-sm truncate">{patient.case_title}</h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            patient.difficulty === '初级' ? 'bg-green-100 text-green-600' :
                            patient.difficulty === '中级' ? 'bg-yellow-100 text-yellow-600' :
                            'bg-red-100 text-red-600'
                          }`}>
                            {patient.difficulty}
                          </span>
                        </div>
                        <p className="text-xs text-emerald-600 leading-relaxed line-clamp-2">{patient.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(patient.symptoms || []).slice(0, 3).map((symptom: string, i: number) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-600">
                              {symptom}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 底部工具栏 */}
            <div className="absolute bottom-6 left-6 right-6">
              <div className="flex gap-2">
                <button
                  onClick={() => currentPage > 1 && loadPatients(currentPage - 1)}
                  disabled={isLoadingPatients || currentPage <= 1}
                  className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-100 hover:bg-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-emerald-700 border border-emerald-200"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">上一页</span>
                </button>
                <button
                  onClick={() => currentPage < totalPages && loadPatients(currentPage + 1)}
                  disabled={isLoadingPatients || currentPage >= totalPages}
                  className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-100 hover:bg-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-emerald-700 border border-emerald-200"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span className="text-sm">下一页</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 主对话区域 */}
        <div className="flex-1 flex flex-col bg-white/30 backdrop-blur-sm">
          {/* 对话头部 */}
          <div className="p-6 bg-white/70 backdrop-blur-xl border-b border-emerald-200/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {clientProfile ? (
                  <img 
                    src={clientProfile.avatar} 
                    alt={clientProfile.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-teal-300 shadow-lg"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 flex items-center justify-center shadow-lg">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                )}
                <div>
                  <h2 className="font-semibold text-emerald-800">
                    {clientProfile ? clientProfile.name : '模拟来访者'}
                  </h2>
                  <p className="text-sm text-emerald-600">
                    {clientProfile ? `${clientProfile.age}岁 · ${clientProfile.occupation}` : 'AI 驱动的心理咨询训练伙伴'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <UserIcon className="w-4 h-4" />
                  <span>第 {currentSession} 次咨询</span>
                </div>
                <button
                  onClick={() => {
                    setIsSessionActive(false);
                    setSessionTime(0);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 transition-colors text-emerald-700 border border-emerald-200"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">重置会话</span>
                </button>
              </div>
            </div>
          </div>

          {/* 消息区域 */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 && (
              <div className="text-center text-emerald-700 py-12">
                请选择左侧场景开始会话
              </div>
            )}
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'counselor' ? 'justify-end' : 'justify-start'}`}>
                {message.type === 'system' ? (
                  <div className="w-full flex justify-center">
                    <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm border border-emerald-200">
                      {message.content}
                    </div>
                  </div>
                ) : (
                  <div className={`flex gap-4 max-w-2xl ${message.type === 'counselor' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${
                      message.type === 'counselor' 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500' 
                        : ''
                    }`}>
                      {message.type === 'counselor' ? (
                        <UserIcon className="w-6 h-6 text-white" />
                      ) : clientProfile ? (
                        <img 
                          src={clientProfile.avatar} 
                          alt={clientProfile.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <Heart className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className={`rounded-3xl px-6 py-4 shadow-lg ${
                      message.type === 'counselor' 
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50' 
                        : 'bg-white/80 backdrop-blur-sm border border-emerald-200/50'
                    }`}>
                      <p className={`leading-relaxed ${
                        message.type === 'counselor' ? 'text-blue-800' : 'text-emerald-800'
                      }`}>
                        {message.content}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-gray-500">{message.timestamp}</span>
                        <div className="flex items-center gap-2">
                          {message.emotion && (() => {
                            const disp = mapEmotionToDisplay(message.emotion);
                            return (
                              <span className={`text-xs px-2 py-1 rounded-full bg-gray-100 ${getEmotionColor(message.emotion || '')}`}>
                                情绪: {disp.emoji} {disp.label}
                              </span>
                            );
                          })()}
                          {message.complaint && (
                            <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              主诉: {message.complaint}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex gap-4 max-w-2xl">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full shadow-lg overflow-hidden">
                    {clientProfile ? (
                      <img 
                        src={clientProfile.avatar} 
                        alt={clientProfile.name}
                        className="w-12 h-12 object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-r from-rose-400 to-pink-400 flex items-center justify-center">
                        <Heart className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="rounded-3xl px-6 py-4 bg-white/80 backdrop-blur-sm border border-emerald-200/50 shadow-lg">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入区域 */}
          <div className="p-6 bg-white/70 backdrop-blur-xl border-t border-emerald-200/50">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-4 items-end">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="请输入您的咨询回应..."
                    className="w-full p-4 pr-12 rounded-2xl bg-white/80 backdrop-blur-sm border-2 border-emerald-200/50 text-emerald-800 placeholder-emerald-500/70 resize-none focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all shadow-lg"
                    rows={1}
                    style={{minHeight: '60px'}}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isTyping || !sessionId}
                  className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg"
                >
                  <Send className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-emerald-600">
                  按 Enter 发送，Shift + Enter 换行
                </p>
                <div className="flex items-center gap-4 text-xs text-emerald-600">
                  <span>💡 提示：{reviewPreviousSessions ? '关注来访者的历史情况和进展' : '专注于当前症状和感受'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
