import { useState, useRef, useEffect } from 'react';
import { 
  processRulesQuery, 
  getRuleCategories, 
  getRulesByCategory,
  getQuickAnswer,
  type ChatMessage, 
  type GameSystem 
} from '../services/rules/rulesChat';
import type { Rule } from '../services/rules/mtgRules';

interface RulesChatProps {
  gameSystem?: GameSystem;
  onBack?: () => void;
}

export function RulesChat({ gameSystem = 'mtg', onBack }: RulesChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const categories = getRuleCategories(gameSystem);

  // Initial greeting
  useEffect(() => {
    const gameName = gameSystem === 'mtg' ? 'Magic: The Gathering' : 'Warhammer 40,000';
    const greeting: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: `Welcome to the ${gameName} Rules Assistant! 🎲\n\nAsk me any rules question, or browse by category. Try:\n• "What is trample?"\n• "How does the stack work?"\n• "When can I cast instants?"`,
      timestamp: new Date()
    };
    setMessages([greeting]);
  }, [gameSystem]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setSelectedCategory(null);

    // Simulate typing delay for natural feel
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));

    // Check for quick answer first
    const quickAnswer = getQuickAnswer(input);
    
    // Process the query
    const { response, rules, suggestions: _suggestions } = processRulesQuery(input, gameSystem);
    void _suggestions; // Future: could use for suggested follow-up questions

    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: quickAnswer || response,
      rules: quickAnswer ? [] : rules,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsTyping(false);

    // Focus input for next question
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    const categoryRules = getRulesByCategory(categoryId, gameSystem);
    const category = categories.find(c => c.id === categoryId);
    
    const categoryMessage: ChatMessage = {
      id: `category-${Date.now()}`,
      role: 'assistant',
      content: `📚 **${category?.name}**\n\n${category?.description}\n\nHere are the rules in this category:`,
      rules: categoryRules,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, categoryMessage]);
    setShowCategories(false);
  };

  return (
    <div className="rules-chat">
      <div className="rules-chat-header">
        {onBack && (
          <button className="back-button" onClick={onBack}>
            ← Back
          </button>
        )}
        <div className="rules-chat-title">
          <span className="rules-chat-icon">📖</span>
          <h2>{gameSystem === 'mtg' ? 'MTG' : 'Warhammer'} Rules Assistant</h2>
        </div>
        <button 
          className={`category-toggle ${showCategories ? 'active' : ''}`}
          onClick={() => setShowCategories(!showCategories)}
        >
          📚 Categories
        </button>
      </div>

      {showCategories && (
        <div className="rules-categories">
          <h3>Browse by Category</h3>
          <div className="category-grid">
            {categories.map(category => (
              <button
                key={category.id}
                className={`category-button ${selectedCategory === category.id ? 'active' : ''}`}
                onClick={() => handleCategoryClick(category.id)}
              >
                <span className="category-name">{category.name}</span>
                <span className="category-description">{category.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rules-chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`chat-message ${message.role}`}>
            <div className="message-avatar">
              {message.role === 'user' ? '👤' : '🤖'}
            </div>
            <div className="message-content">
              <div className="message-text">
                {message.content.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
              
              {message.rules && message.rules.length > 0 && (
                <div className="message-rules">
                  {message.rules.map((rule) => (
                    <RuleCard key={rule.id} rule={rule} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="chat-message assistant">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="rules-chat-suggestions">
        <span>Quick questions:</span>
        <button onClick={() => handleSuggestionClick('What is trample?')}>Trample</button>
        <button onClick={() => handleSuggestionClick('How does the stack work?')}>Stack</button>
        <button onClick={() => handleSuggestionClick('What is summoning sickness?')}>Summoning Sickness</button>
        <button onClick={() => handleSuggestionClick('When can I cast instants?')}>Instants</button>
      </div>

      <form className="rules-chat-input" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a rules question..."
          disabled={isTyping}
        />
        <button type="submit" disabled={isTyping || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

function RuleCard({ rule }: { rule: Rule }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rule-card ${expanded ? 'expanded' : ''}`}>
      <div className="rule-card-header" onClick={() => setExpanded(!expanded)}>
        <span className="rule-number">{rule.number}</span>
        <span className="rule-title">{rule.title}</span>
        <span className="rule-expand">{expanded ? '−' : '+'}</span>
      </div>
      {expanded && (
        <div className="rule-card-body">
          <p className="rule-text">{rule.text}</p>
          <div className="rule-keywords">
            {rule.keywords.slice(0, 5).map(kw => (
              <span key={kw} className="rule-keyword">{kw}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
