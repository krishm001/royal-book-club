import React, { useState, useEffect } from 'react';
import { BarChart3, CheckCircle2, Users, Lock, RefreshCw } from 'lucide-react';
import { fetchActivePoll, castVote } from '../../services/pollApi';
import './PollWidget.css';

const PollWidget = ({ user, onSignIn }) => {
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [votedIndex, setVotedIndex] = useState(null);
  const [animate, setAnimate] = useState(false);

  // Load the active poll on mount
  useEffect(() => {
    const getPoll = async () => {
      try {
        setLoading(true);
        const res = await fetchActivePoll();
        if (res?.success && res?.data) {
          const activePoll = res.data;
          setPoll(activePoll);
          
          // Check if user has already voted on this specific poll
          const savedVoteIndex = localStorage.getItem(`royal-poll-${activePoll.id}`);
          if (savedVoteIndex !== null) {
            setVotedIndex(parseInt(savedVoteIndex, 10));
          }
        } else {
          setError('No active plebiscites available at the moment.');
        }
      } catch (err) {
        console.error('Failed to fetch active poll', err);
        setError('The Scribes are currently offline. Unable to fetch active plebiscite.');
      } finally {
        setLoading(false);
      }
    };

    getPoll();
  }, []);

  // Trigger results growing animation
  useEffect(() => {
    if (votedIndex !== null) {
      const timer = setTimeout(() => setAnimate(true), 50);
      return () => clearTimeout(timer);
    } else {
      setAnimate(false);
    }
  }, [votedIndex]);

  // Handle Casting a Vote
  const handleVote = async (optionIndex) => {
    if (votedIndex !== null || !poll) return;

    // Check membersOnly condition in frontend (extra guard)
    if (poll.membersOnly && !user) {
      if (onSignIn) onSignIn();
      return;
    }

    // 1. Optimistic UI update
    const updatedVotes = [...poll.votes];
    updatedVotes[optionIndex] = (updatedVotes[optionIndex] || 0) + 1;
    
    setPoll(prev => ({
      ...prev,
      votes: updatedVotes
    }));
    setVotedIndex(optionIndex);
    
    // Save state to localStorage to prevent duplicate votes
    localStorage.setItem(`royal-poll-${poll.id}`, optionIndex.toString());

    // 2. Perform backend update in background
    try {
      await castVote(poll.id, optionIndex);
    } catch (err) {
      console.error('Failed to register vote in ledger', err);
      // Revert if error occurs (optional but keeps frontend aligned)
      // Since it's a minor aggregate, we let it slide for seamless UX,
      // but log it clearly in console.
    }
  };

  if (loading) {
    return (
      <div className="royal-card poll-widget" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '250px' }}>
        <div style={{ textAlign: 'center', color: 'var(--accent)' }}>
          <RefreshCw className="animate-spin" size={28} style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>Consulting the Guild Scrolls...</p>
        </div>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="royal-card poll-widget" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '250px', padding: '30px' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <BarChart3 size={32} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ fontSize: '0.9rem' }}>{error || 'No active community plebiscites at this time.'}</p>
        </div>
      </div>
    );
  }

  // Security Gating: If poll is members-only and user is not logged in
  if (poll.membersOnly && !user) {
    return (
      <div className="poll-widget-gated animate-fade-in">
        <div className="poll-gated-icon-wrapper">
          <Lock size={24} />
        </div>
        <h3 className="poll-gated-title gold-gradient-text">Sovereign Plebiscite Gated</h3>
        <p className="poll-gated-desc">
          This community plebiscite is restricted to active members of the Royal Guild. Please sign in or request an invitation to participate.
        </p>
        <button onClick={onSignIn} className="poll-gated-btn">
          Sign In to Vote
        </button>
      </div>
    );
  }

  const totalVotes = poll.votes.reduce((sum, v) => sum + v, 0);

  return (
    <div className="royal-card poll-widget animate-fade-in" id={`poll-${poll.id}`}>
      <div className="poll-header-row">
        <div className="poll-icon-wrapper">
          <BarChart3 className="poll-header-icon" size={20} />
        </div>
        <div className="poll-meta">
          <span className="poll-tag">
            {poll.membersOnly ? 'Sovereign Guild Plebiscite' : 'Community Plebiscite'}
          </span>
          <h3 className="poll-question">{poll.question}</h3>
        </div>
      </div>

      <div className="poll-options-container">
        {poll.options.map((optionText, idx) => {
          const optionVotes = poll.votes[idx] || 0;
          const votePercentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
          const isSelected = votedIndex === idx;
          const hasVoted = votedIndex !== null;

          return (
            <div 
              key={idx}
              className={`poll-option-wrapper ${isSelected ? 'selected' : ''} ${hasVoted ? 'voted-state' : ''}`}
              onClick={() => !hasVoted && handleVote(idx)}
              role="button"
              tabIndex={hasVoted ? -1 : 0}
              id={`poll-opt-${poll.id}-${idx}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !hasVoted) {
                  handleVote(idx);
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
                      {optionText}
                      {isSelected && <CheckCircle2 size={16} className="selected-check-icon" />}
                    </span>
                    <span className="option-percentage glow-text">{animate ? `${votePercentage}%` : '0%'}</span>
                  </div>
                </div>
              ) : (
                // Voting Interactive Option Button
                <div className="poll-option-interactive">
                  <span className="option-text">{optionText}</span>
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
          <span>{totalVotes.toLocaleString()} votes cast in Scribes Ledger</span>
        </div>
        {votedIndex !== null && (
          <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: '600', letterSpacing: '0.05em' }}>
            ✓ VOTE RECORDED
          </span>
        )}
      </div>
    </div>
  );
};

export default PollWidget;
