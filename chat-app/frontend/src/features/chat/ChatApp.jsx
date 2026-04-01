import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useGetMessagesQuery } from "../../app/services/chatApi";
import { messageReceived, setTyping, clearTyping } from "./chatSlice";
import socket from "../../socket";
import "./chat.css";

const USER_COLORS = [
  "#7c3aed", "#0891b2", "#059669", "#db2777", "#d97706",
  "#dc2626", "#0d9488", "#9333ea", "#ea580c", "#2563eb",
];

function getColor(name) {
  let hash = 0;
  for (let c of name) hash = c.charCodeAt(0) + hash;
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

function Avatar({ name, size = 36 }) {
  return (
    <div className="avatar" style={{
      width: size, height: size,
      background: getColor(name),
      fontSize: size * 0.38
    }}>
      {name[0].toUpperCase()}
    </div>
  );
}

function MessageBubble({ msg, isMine, showAvatar }) {
  const time = new Date(msg.id).toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit"
  });
  return (
    <div className={`msg-row ${isMine ? "mine" : "theirs"}`}>
      {!isMine && showAvatar && <Avatar name={msg.sender} size={32} />}
      {!isMine && !showAvatar && <div style={{ width: 32 }} />}
      <div className="msg-col">
        {showAvatar && !isMine && (
          <span className="msg-sender" style={{ color: getColor(msg.sender) }}>
            {msg.sender}
          </span>
        )}
        <div className={`bubble ${isMine ? "bubble-mine" : "bubble-theirs"}`}>
          <span className="msg-text">{msg.text}</span>
        </div>
        <span className="msg-time">{time}</span>
      </div>
    </div>
  );
}

function TypingIndicator({ typers }) {
  if (!typers.length) return null;
  const label = typers.length === 1
    ? `${typers[0]} is typing`
    : `${typers.slice(0, -1).join(", ")} and ${typers.at(-1)} are typing`;
  return (
    <div className="typing-row">
      <div className="typing-dots"><span /><span /><span /></div>
      <span className="typing-label">{label}</span>
    </div>
  );
}

function JoinScreen({ onJoin }) {
  const [inputName, setInputName] = useState("");
  const [error, setError] = useState("");

  const handleJoin = () => {
    const trimmed = inputName.trim();
    if (!trimmed) { setError("Please enter your name."); return; }
    if (trimmed.length < 2) { setError("Name must be at least 2 characters."); return; }
    if (trimmed.length > 20) { setError("Name must be under 20 characters."); return; }
    onJoin(trimmed);
  };

  return (
    <div className="join-screen">
      <div className="join-card">
        <div className="join-logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">FluxChat</span>
        </div>
        <p className="join-tagline">Real-time chat · RTK Query + Socket.IO</p>
        <div className="join-form">
          <label className="join-label">What's your name?</label>
          <input
            className="join-input"
            value={inputName}
            onChange={(e) => { setInputName(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            placeholder="Enter your name…"
            maxLength={20}
            autoFocus
          />
          {error && <p className="join-error">{error}</p>}
          <button className="join-btn" onClick={handleJoin}>
            Join Chat
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <p className="join-hint">No account needed — just enter a name and start chatting</p>
      </div>
    </div>
  );
}

export default function ChatApp() {
  const dispatch = useDispatch();
  const [username, setUsername] = useState(() => localStorage.getItem("fluxchat_username") || null);
  const [text, setText] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const { data: history = [] } = useGetMessagesQuery();
  const liveMessages = useSelector((s) => s.chat.liveMessages);
  const typers = useSelector((s) => s.chat.typers);

  const allMessages = [...history, ...liveMessages];

  useEffect(() => {
    if (!username) return;

    socket.on("new_message", (msg) => dispatch(messageReceived(msg)));
    socket.on("user_typing", ({ name }) => dispatch(setTyping(name)));
    socket.on("user_stopped_typing", ({ name }) => dispatch(clearTyping(name)));
    socket.on("online_users", (users) => setOnlineUsers(users));

    socket.emit("user_join", { name: username });

    const timer = setTimeout(() => {
      socket.emit("request_online_users");
    }, 500);

    return () => {
      clearTimeout(timer);
      socket.off("new_message");
      socket.off("user_typing");
      socket.off("user_stopped_typing");
      socket.off("online_users");
      socket.emit("user_leave", { name: username });
    };
  }, [username, dispatch]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages, typers]);

  const handleTyping = (e) => {
    setText(e.target.value);
    socket.emit("typing", { name: username });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("stop_typing", { name: username });
    }, 1500);
  };

  const sendMessage = () => {
    if (!text.trim()) return;
    socket.emit("send_message", { text, sender: username });
    socket.emit("stop_typing", { name: username });
    clearTimeout(typingTimeout.current);
    setText("");
  };

  if (!username) return <JoinScreen onJoin={(name) => { localStorage.setItem("fluxchat_username", name); setUsername(name); }} />;

  return (
    <div className="app-shell">
      <div className="noise" />

      {/* Sidebar overlay backdrop (mobile) */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">FluxChat</span>
          </div>
          {/* Close button inside sidebar on mobile */}
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="identity-section">
          <p className="section-label">You are</p>
          <div className="identity-box">
            <Avatar name={username} size={40} />
            <div>
              <div className="identity-name">{username}</div>
              <div className="identity-sub">joined as guest</div>
            </div>
          </div>
        </div>

        <div className="online-section">
          <p className="section-label">Online — {onlineUsers.length}</p>
          <div className="online-list">
            {onlineUsers.map((u, i) => (
              <div key={i} className="online-item">
                <div style={{ position: "relative" }}>
                  <Avatar name={u} size={32} />
                  <span className="online-dot" />
                </div>
                <span className="online-name">{u}</span>
                {u === username && <span className="you-badge">you</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="stats-section">
          <div className="stat-card">
            <span className="stat-num">{allMessages.length}</span>
            <span className="stat-label">messages</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">{onlineUsers.length}</span>
            <span className="stat-label">online</span>
          </div>
        </div>
      </aside>

      <main className="chat-panel">
        <header className="chat-header">
          <div className="channel-info">
            {/* Hamburger — visible on mobile only */}
            <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <span className="channel-hash">#</span>
            <span className="channel-name">general</span>
            <span className="channel-dot" />
            <span className="channel-sub">Real-time · RTK Query + Socket.IO</span>
          </div>
          <div className="header-actions">
            <div className="tech-badge">RTK Query</div>
            <div className="tech-badge socket">Socket.IO</div>
            {/* Theme toggle */}
            <button className="theme-toggle" onClick={() => setDarkMode((d) => !d)} aria-label="Toggle theme">
              {darkMode ? "☀️" : "🌙"}
            </button>
          </div>
        </header>

        <div className="messages-area">
          {allMessages.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <p className="empty-title">No messages yet</p>
              <p className="empty-sub">Say hi to everyone!</p>
            </div>
          )}
          {allMessages.map((msg, i) => {
            const isMine = msg.sender === username;
            const prev = allMessages[i - 1];
            const showAvatar = !prev || prev.sender !== msg.sender;
            return (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isMine={isMine}
                showAvatar={showAvatar}
              />
            );
          })}
          <TypingIndicator typers={typers.filter((t) => t !== username)} />
          <div ref={bottomRef} />
        </div>

        <div className="input-bar">
          <Avatar name={username} size={36} />
          <div className="input-wrap">
            <input
              className="chat-input"
              value={text}
              onChange={handleTyping}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder={`Message as ${username}…`}
              maxLength={500}
            />
            <span className="char-count">
              {text.length > 400 ? `${500 - text.length}` : ""}
            </span>
          </div>
          <button
            className={`send-btn ${text.trim() ? "active" : ""}`}
            onClick={sendMessage}
            disabled={!text.trim()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </main>
    </div>
  );
}