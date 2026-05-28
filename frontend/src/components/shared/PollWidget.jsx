import React, { useState, useEffect } from 'react';
import { BarChart3, CheckCircle2, Users } from 'lucide-react';
import './PollWidget.css';

const PollWidget = ({ 
  pollId = 'weekly-book-poll', 
  question = 'Which masterwork should be selected for the Sovereign Guild Summer Read?',
  options = [
    { id: 'opt-1', text: 'The Picture of Dorian Gray — Oscar Wilde', initialVotes: 142 },
    { id: 'opt-2', text: 'The Great Gatsby — F. Scott Fitzgerald', initialVotes: 98 },
    { id: 'opt-3', text: 'Pride and Prejudice — Jane Austen', initialVotes: 167 },
    { id: 'opt-4', text: 'Crime and Punishment — Fyodor Dostoevsky', initialVotes: 115 }
  ]
}) => {
  const [votedOptionId, setVotedOptionId] = useState(null);
  const [votesData, setVotesData] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Load vote from localStorage
    const savedVote = localStorage.getItem(`royal-poll-${pollId}`);
    if (savedVote) {
      setVotedOptionId(savedVote);
    }

    // Load or set votes
    const cachedVotes = localStorage.getItem(`royal-poll-data-${pollId}`);
    if (cachedVotes) {
      const parsed = JSON.parse(cachedVotes);
      setVotesData(parsed);
      setTotalVotes(parsed.reduce((sum, opt) => sum + opt.votes, 0));
    } else {
      const data = options.map(opt => ({
        id: opt.id,
        text: opt.text,
        votes: opt.initialVotes
      }));
      setVotesData(data);
      setTotalVotes(data.reduce((sum, opt) => sum + opt.votes, 0));
    }
  }, [pollId, options]);

  useEffect(() => {
    if (votedOptionId) {
      // Trigger grow animations
      const timer = setTimeout(() => setAnimate(true), 50);
      return () => clearTimeout(timer);
    } else {
      setAnimate(false);
    }
  }, [votedOptionId]);

  const handleVote = (optionId) => {
    if (votedOptionId) return; // Prevent multiple voting

    const updatedData = votesData.map(opt => {
      if (opt.id === optionId) {
        return { ...opt, votes: opt.votes + 1 };
      }
      return opt;
    });

    setVotesData(updatedData);
    setTotalVotes(prev => prev + 1);
    setVotedOptionId(optionId);
    
    // Save to localStorage
    localStorage.setItem(`royal-poll-${pollId}`, optionId);
    localStorage.setItem(`royal-poll-data-${pollId}`, JSON.stringify(updatedData));
  };

  const handleResetVote = () => {
    if (!votedOptionId) return;

    const updatedData = votesData.map(opt => {
      if (opt.id === votedOptionId) {
        return { ...opt, votes: Math.max(0, opt.votes - 1) };
      }
      return opt;
    });

    setVotesData(updatedData);
    setTotalVotes(prev => Math.max(0, prev - 1));
    setVotedOptionId(null);
    setAnimate(false);

    localStorage.removeItem(`royal-poll-${pollId}`);
    localStorage.setItem(`royal-poll-data-${pollId}`, JSON.stringify(updatedData));
  };

  return (
    <div className="royal-card poll-widget" id={`poll-${pollId}`}>
      <div className="poll-header-row">
        <div className="poll-icon-wrapper">
          <BarChart3 className="poll-header-icon" size={20} />
        </div>
        <div className="poll-meta">
          <span className="poll-tag">Salon Plebiscite</span>
          <h3 className="poll-question">{question}</h3>
        </div>
      </div>

      <div className="poll-options-container">
        {votesData.map((option) => {
          const votePercentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
          const isSelected = votedOptionId === option.id;
          const hasVoted = votedOptionId !== null;

          return (
            <div 
              key={option.id}
              className={`poll-option-wrapper ${isSelected ? 'selected' : ''} ${hasVoted ? 'voted-state' : ''}`}
              onClick={() => !hasVoted && handleVote(option.id)}
              role="button"
              tabIndex={hasVoted ? -1 : 0}
              id={`poll-opt-${option.id}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !hasVoted) {
                  handleVote(option.id);
                }
              }}
            >
              {hasVoted ? (
                // Voting Results with animated bars
                <div className="poll-result-bar-container">
                  <div 
                    className="poll-result-fill"
                    style={{ 
                      width: animate ? `${votePercentage}%` : '0%',
                      transition: 'width 1.2s cubic-bezier(0.1, 1, 0.1, 1)' 
                    }}
                  />
                  <div className="poll-result-content">
                    <span className="option-text">
                      {option.text}
                      {isSelected && <CheckCircle2 size={16} className="selected-check-icon" />}
                    </span>
                    <span className="option-percentage glow-text">{animate ? `${votePercentage}%` : '0%'}</span>
                  </div>
                </div>
              ) : (
                // Voting Interactive Option Button
                <div className="poll-option-interactive">
                  <span className="option-text">{option.text}</span>
                  <div className="option-bullet"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="poll-footer-row">
        <div className="poll-stats">
          <Users size={16} />
          <span>{totalVotes.toLocaleString()} votes cast by Patrons</span>
        </div>
        {votedOptionId && (
          <button onClick={handleResetVote} className="change-vote-btn" id="change-vote-btn">
            Change Vote
          </button>
        )}
      </div>
    </div>
  );
};

export default PollWidget;
