import React, { useEffect, useState, useRef } from 'react';
import EventService from './EventService';
import aiService from '../../../services/aiService';
import { useStore } from '../../../hooks/useStore';
import './aiRecommend.scss';
import useNotification from '../Notification/useNotification';
import { NotificationsContainer } from '../Notification/Notification';
import { Icon } from 'lucide-react';
import { Icons } from 'react-toastify';
import coc1Icon from '../../../../src/assets/images/coc1.png';
import coc2Icon from '../../../../src/assets/images/coc2.png';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Plus, Maximize2, Minimize2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  parseSearchIntent,
  searchEventsByIntent,
  generateSearchResponse,
  getTrendingEvents,
  getCategories,
  formatEventDateDisplay,
} from '../../../services/eventSearchService';



export default function AIRecommend({ userId, limit = 6 }) {
  // if (!userId) {
  //   return null;
  // }
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [notifications, notifier] = useNotification();
  const scrollContainerRef = React.useRef(null);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [messages, setMessages] = useState([
    { id: 'sys-1', from: 'ai', text: 'Hi! I can recommend events or help you find tickets. Ask me anything.' }
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const store = useStore();
  const user = store?.dataUser || {};
  const avatarUrl = user?.avatar_url || user?.avatar || null;
  // per-user storage key (falls back to a guest key)
  const storageKey = (() => {
    const uid = user?.id || user?._id || user?.userId || null;
    return uid ? `ai_chat_${uid}_v1` : 'ai_chat_messages_v1';
  })();
  const saveTimeoutRef = useRef(null);

  // Helper to append or replace the last AI message to avoid spamming
  const upsertAiMessage = (newMsg) => {
    setMessages((prev) => {
      if (!prev || prev.length === 0) return [newMsg];
      const last = prev[prev.length - 1];
      // Replace last message when it's from AI (but don't replace the initial system message)
      if (last && last.from === 'ai' && last.id !== 'sys-1') {
        return [...prev.slice(0, -1), newMsg];
      }
      return [...prev, newMsg];
    });
  };

  useEffect(() => {
    // Load persisted messages if any (preserve across navigation)
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load AI chat messages from storage', e);
    }

    if (!open) return; // only load when opened
    setLoading(true);
    // Use service to fetch enriched trending events (with normalized fields)
    getTrendingEvents()
      .then((items) => {
        if (items && items.length) {
          setEvents(items.slice(0, limit));
        }
      })
      .catch((e) => console.error('Error loading trending events', e))
      .finally(() => setLoading(false));
  }, [limit, open, storageKey]);

  // Persist messages to localStorage so chat survives navigation
  useEffect(() => {
    try {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        try {
          // keep only the most recent `limit` messages to avoid excessive storage
          const toSave = messages.slice(-limit);
          localStorage.setItem(storageKey, JSON.stringify(toSave));
        } catch (e) {
          console.warn('Failed to save AI chat messages to storage', e);
        }
      }, 500);
    } catch (e) {
      console.warn('Failed to schedule save for AI messages', e);
    }

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [messages, storageKey, limit]);

  const launcherLabel = open ? 'Close AI' : 'AI chat';

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -120, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 120, behavior: 'smooth' });
    }
  };

  const handlePromoPrev = () => {
    setCurrentEventIndex((prev) =>
      prev === 0 ? events.length - 1 : prev - 1
    );
  };

  const handlePromoNext = () => {
    setCurrentEventIndex((prev) =>
      prev === events.length - 1 ? 0 : prev + 1
    );
  };

  const sendMessage = async (text) => {
    if (!text || !text.trim()) return;
    const userMsg = { id: `u-${Date.now()}`, from: 'user', text };
    setMessages((s) => [...s, userMsg]);
    setInput('');
    setThinking(true);
    try {
      // 1. Parse user intent to search for events
      const intent = parseSearchIntent(text);
      const searchResults = await searchEventsByIntent(intent);

      // 2. Generate AI response based on search results
      const aiResponse = generateSearchResponse(intent, searchResults);

      // 3. Update promo banner with search results
      if (searchResults.length > 0) {
        setEvents(searchResults);
        setCurrentEventIndex(0);
      }

      // 4. Add AI response to chat
      const aiMsg = {
        id: `ai-${Date.now()}`,
        from: 'ai',
        text: aiResponse.message,
        suggestions: aiResponse.suggestions || [],
        events: aiResponse.events || []
      };
      upsertAiMessage(aiMsg);
    } catch (err) {
      const errMsg = { id: `ai-err-${Date.now()}`, from: 'ai', text: 'AI service error. Please try again later.' };
      upsertAiMessage(errMsg);
    } finally {
      setThinking(false);
    }
  };

  const handleSuggestion = (suggestionText) => {
    // When user clicks a suggestion, send it as a new user message
    if (!suggestionText) return;
    // If the user clicked the generic "Tìm theo thể loại" action, fetch categories
    const prefix = 'Tìm theo thể loại';
    if (suggestionText.trim() === prefix) {
      // show loading AI message
      const loadingAi = { id: `ai-cats-${Date.now()}`, from: 'ai', text: 'Đang tải các thể loại...' };
      setMessages((s) => [...s, loadingAi]);

      getCategories().then((cats) => {
        const catNames = (cats || []).map(c => (c.name || '').toString().trim()).filter(Boolean);

        // Compute counts for each category from current `events` state
        const counts = {};
        for (const name of catNames) counts[name] = 0;
        for (const ev of events || []) {
          const cat = (ev.category || ev._original?.category || ev._original?.category_id || '').toString().trim();
          if (cat && counts.hasOwnProperty(cat)) counts[cat] = (counts[cat] || 0) + 1;
        }

        const suggestionsWithCounts = catNames.map(n => (counts[n] > 0 ? `${n} (${counts[n]})` : n));

        const aiMsg = {
          id: `ai-cats-${Date.now()}-res`,
          from: 'ai',
          text: 'Chọn một thể loại để tìm:',
          suggestions: suggestionsWithCounts.length > 0 ? suggestionsWithCounts : ['Music', 'Sports', 'Technology']
        };
        setMessages((s) => {
          // replace last loading message (optional: keep it simple and append)
          return [...s.filter(m => m.id !== loadingAi.id), aiMsg];
        });
      }).catch((e) => {
        setMessages((s) => [...s, { id: `ai-cats-err-${Date.now()}`, from: 'ai', text: 'Không thể tải thể loại, vui lòng thử lại.' }]);
      });

      return;
    }

    // Detect campus suggestions like 'Hà Nội (3)' or plain campus name and handle inline filter
    const campusNames = ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Cần Thơ', 'Quy Nhơn'];
    const campusMatch = suggestionText.match(/^(.+?)\s*\(\d+\)\s*$/);
    const campusName = campusMatch ? campusMatch[1].trim() : suggestionText.trim();

    if (campusNames.includes(campusName)) {
      // Intercept: fetch events for this campus and display inline without sending a user message
      (async () => {
        setThinking(true);
        try {
          // Map display campus name to canonical location key expected by backend
          const locationMap = {
            'Hà Nội': 'Hà Nội',
            'Hồ Chí Minh': 'Sài Gòn',
            'Đà Nẵng': 'Đà Nẵng',
            'Cần Thơ': 'Cần Thơ',
            'Quy Nhơn': 'Quy Nhơn',
          };
          const canonicalLocation = locationMap[campusName] || campusName;

          // build a simple intent with the canonical location key
          const intent = { location: canonicalLocation, keywords: [], category: null, timeRange: null, priceRange: null };
          const results = await searchEventsByIntent(intent);

          // Update promo banner and inline event cards
          if (results && results.length > 0) {
            setEvents(results);
            setCurrentEventIndex(0);
          }

          const compactText = results && results.length > 0
            ? `Tìm thấy ${results.length} sự kiện tại ${campusName}. Xem chi tiết phía dưới.`
            : `Không tìm thấy sự kiện tại ${campusName}.`;

          const aiMsg = { id: `ai-${Date.now()}`, from: 'ai', text: compactText, suggestions: [], events: results || [] };
          upsertAiMessage(aiMsg);
        } catch (e) {
          setMessages((s) => [...s, { id: `ai-err-${Date.now()}`, from: 'ai', text: 'Lỗi khi tải sự kiện cho cơ sở này.' }]);
        } finally {
          setThinking(false);
        }
      })();

      return;
    }

    // Intercept category name clicks: fetch known categories and if the suggestion
    // matches a category, perform an inline category search (no user message).
    (async () => {
      try {
        setThinking(true);
        const cats = await getCategories();
        const catNames = (cats || []).map(c => (c.name || '').toString().trim()).filter(Boolean);
        const lower = suggestionText.toString().trim().toLowerCase();
        const matched = catNames.find(n => n.toLowerCase() === lower || (`Tìm theo thể loại: ${n}`).toLowerCase() === lower);
        if (matched) {
          // perform category search inline
          const intent = { category: matched, keywords: [], location: null, timeRange: null, priceRange: null };
          const results = await searchEventsByIntent(intent);

          if (results && results.length > 0) {
            setEvents(results);
            setCurrentEventIndex(0);
          }

          const compactText = results && results.length > 0
            ? `Tìm thấy ${results.length} sự kiện thuộc thể loại ${matched}. Xem chi tiết phía dưới.`
            : `Không tìm thấy sự kiện thuộc thể loại ${matched}.`;

          const aiMsg = { id: `ai-${Date.now()}`, from: 'ai', text: compactText, suggestions: [], events: results || [] };
          upsertAiMessage(aiMsg);
          return; // handled
        }
      } catch (e) {
        console.warn('Error handling category suggestion inline', e);
      } finally {
        setThinking(false);
      }
    })();

    // If suggestion already contains a category (e.g. 'Tìm theo thể loại: Music')
    // or is a category name itself, forward it as a user query after a short delay
    setTimeout(() => sendMessage(suggestionText), 200);
  };

  // Inline fallback styles for suggestion chips (higher specificity than external styles)
  const suggestionWrapperStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '8px',
    width: '100%',
  };

  const suggestionBtnStyle = {
    display: 'block',
    width: '100%',
    padding: '10px 14px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#0f172a',
    background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
    border: 'none',
    borderRadius: '12px',
    textAlign: 'left',
    boxShadow: '0 6px 18px rgba(15, 23, 42, 0.06)',
    cursor: 'pointer',
  };
  

  return (
    <div className={`ai-recommend-float ${open ? 'open' : ''}`}>
      
        <img 
          src={open ? coc2Icon : coc1Icon} 
          alt="AI Assistant" 
          className="ai-launcher" 
          onClick={() => setOpen(!open)} 
          aria-label={launcherLabel} 
        />
  
      <div className={`ai-panel ${isExpanded ? 'expanded' : ''}`} role="dialog" aria-hidden={!open}>
        <div className="ai-panel-header">
          <h4>Recommended events</h4>
          <div className="ai-panel-header-actions">
            <button
              className="ai-expand"
              title={isExpanded ? 'Thu nhỏ chat' : 'Phóng to chat'}
              aria-label={isExpanded ? 'Thu nhỏ chat' : 'Phóng to chat'}
              aria-pressed={isExpanded}
              onClick={() => setIsExpanded((prev) => !prev)}
            >
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button className="ai-new" title="New chat" aria-label="New chat" onClick={() => {
              // New chat: clear messages and events and per-user storage key
              const sys = { id: 'sys-1', from: 'ai', text: 'Hi! I can recommend events or help you find tickets. Ask me anything.' };
              setMessages([sys]);
              setEvents([]);
              setCurrentEventIndex(0);
              setIsExpanded(false);
              try { localStorage.removeItem(storageKey); } catch(e){}
            }}>
              <Plus size={16} />
            </button>
            <button className="ai-close" onClick={() => setOpen(false)}>×</button>
          </div>
        </div>
        <div className="ai-panel-body">
          {/* Promo Banner Section */}
         
          {/* Chat area */}
          <div className="ai-chat">
            {messages.map((m) => (
                <div key={m.id} className={`ai-msg ${m.from === 'ai' ? 'ai' : 'user'}`}>
                  <div className="ai-msg-text">{m.text}</div>
                  {m.from === 'ai' && m.suggestions && m.suggestions.length > 0 && (
                    <div className="ai-suggestions" style={suggestionWrapperStyle}>
                      {m.suggestions.map((s, idx) => (
                        <button key={idx} className="ai-suggestion-btn" style={suggestionBtnStyle} onClick={() => handleSuggestion(s)}>
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                  {m.from === 'ai' && m.events && m.events.length > 0 && (
                    <div className="ai-result-list">
                      {m.events.slice(0,5).map((ev, i) => (
                        <div key={ev.id || i} className="ai-result-card">
                          <img src={ev.image || '/placeholder.jpg'} alt={ev.title} className="ai-result-img" />
                          <div className="ai-result-body">
                            <div className="ai-result-title">{ev.title}</div>
                            <div className="ai-result-meta">{formatEventDateDisplay(ev.date_start || ev.start_time || ev._original?.date_start || ev._original?.start_time)}</div>
                            <div className="ai-result-meta">{ev.location || 'TBA'}</div>
                            <div className="ai-result-price">{(ev.price === 0 || ev.price === '0') ? 'Miễn phí' : (typeof ev.price === 'number' ? (ev.price >= 1000 ? `${Math.round(ev.price/1000)}k` : `${ev.price}đ`) : ev.price)}</div>
                            <Link to={`/event/${ev.id}`} className="ai-result-cta">Xem</Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
            ))}
            {thinking && <div className="ai-msg ai thinking"><div className="ai-msg-text" /></div>}
          </div>
          <div className="ai-input-row">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask me to recommend events..." onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(input); }} />
            <button className="ai-send" onClick={() => sendMessage(input)} disabled={!input.trim()}>Send</button>
          </div>
        </div>
      </div>
      <NotificationsContainer notifications={notifications} onClose={notifier.remove} />
    </div>
  );
}
