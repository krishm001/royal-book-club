import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, MessageSquare, Send, Calendar, Clock, Award, ShieldAlert } from 'lucide-react';
import './ArticleDetailPage.css';

const ArticleDetailPage = ({ user }) => {
  const { id } = useParams();
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([
    { id: 1, author: 'Lady Chesterfield', content: 'Exquisite analysis of Dorian Gray. The focus on Victorian aestheticism is beautifully argued.', date: 'May 28, 2026' },
    { id: 2, author: 'Eminent Scholar', content: 'I particularly enjoyed the paragraph highlighting Wilde’s private letters. Outstanding scholarship.', date: 'May 29, 2026' }
  ]);

  // Sample static articles lookup
  const articles = [
    {
      id: 'article-1',
      title: 'The Hedonistic Tapestry of Oscar Wilde',
      excerpt: 'An in-depth critique of artistic morality in Victorian England, analyzing the underlying themes of decay and aesthetic idealism.',
      author: 'Archduke of Prose',
      date: 'May 28, 2026',
      readTime: '6 min read',
      category: 'Critique',
      coverUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=1200&q=80',
      bodyHtml: `
        <p>Oscar Wilde’s only novel, <em>The Picture of Dorian Gray</em>, stands as the ultimate aesthetic testament of late Victorian London. It represents not simply a gothic tale of decay, but an aggressive intellectual defense of the Decadent movement, where art reigns superior to life, and sensation is the highest virtue.</p>
        <p>At the center of this hedonistic tapestry is the charming philosopher, Lord Henry Wotton. It is Wotton who delivers the poisonous, honeyed ideas that serve as Dorian’s roadmap to corruption. "To define is to limit," Wotton declares, establishing a philosophy where boundaries—moral, societal, or religious—are viewed as artificial chains on human experience.</p>
        <blockquote>"The only way to get rid of a temptation is to yield to it. Resist it, and your soul grows sick with longing for the things it has forbidden to itself." — Lord Henry Wotton</blockquote>
        <p>Yet, Wilde’s genius lies in the tragic irony of Dorian’s descent. While Dorian remains outwardly pristine, a physical manifestation of Wotton’s aesthetic ideals, his portrait records the genuine weight of his sins. The artwork becomes the objective reality, proving that morality cannot be entirely bypassed for pure sensory indulgence. In the end, Wilde demonstrates that the pursuit of absolute hedonism, separated from responsibility, inevitably destroys the self.</p>
      `
    },
    {
      id: 'article-2',
      title: 'Dante’s Architectural Afterlife',
      excerpt: 'A comprehensive study examining the spatial layout of Dante’s Inferno as a reflection of medieval cosmic geometry.',
      author: 'Lady Chesterfield',
      date: 'May 14, 2026',
      readTime: '10 min read',
      category: 'Research',
      coverUrl: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=1200&q=80',
      bodyHtml: `
        <p>Dante Alighieri’s <em>Divine Comedy</em> is not simply a poetic masterpiece; it is a stunning exercise in theological architecture and cosmic geometry. The journey through the three realms of the afterlife is structured with mathematical precision, reflecting the medieval scholastic belief in an orderly, rational universe designed by a divine architect.</p>
        <p>The <em>Inferno</em>, in particular, is mapped as a subterranean, funnel-shaped abyss located directly beneath Jerusalem. Formed by the fall of Lucifer, this funnel consists of nine concentric, descending circles. As Virgil and Dante descend, the circles contract, representing the increasing density of sin and the corresponding constriction of human freedom.</p>
        <p>Dante’s geometric symmetry extends to the structure of the poem itself. The Comedy consists of 100 cantos, divided into three canticles (Inferno, Purgatorio, Paradiso), each containing 33 cantos (with Inferno having an additional introductory canto). The number three, of course, honors the Holy Trinity, while ten represents scholastic perfection. This alignment of geometric space with poetic meter creates a literary cathedral, where form and faith become indistinguishable.</p>
      `
    }
  ];

  const article = articles.find(a => a.id === id) || articles[0];

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newComment = {
      id: Date.now(),
      author: user?.displayName || 'Sovereign Patron',
      content: commentText,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };

    setComments([...comments, newComment]);
    setCommentText('');
  };

  return (
    <div className="article-detail-container animate-fade-in">
      {/* Back to feed */}
      <Link to="/articles" className="back-link">
        <ArrowLeft size={16} /> Return to Dissertations
      </Link>

      {/* Main Article Card */}
      <article className="royal-card article-detail-view">
        {/* Header Cover */}
        <div className="article-detail-cover-wrapper">
          <img src={article.coverUrl} alt={article.title} className="detail-cover-hero-img" />
          <div className="detail-cover-overlay"></div>
        </div>

        {/* Post Metadata */}
        <div className="article-detail-meta">
          <span className="detail-category-badge">{article.category}</span>
          <div className="meta-items-row">
            <span className="meta-item"><Calendar size={14} /> {article.date}</span>
            <span className="meta-item"><Clock size={14} /> {article.readTime}</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="article-detail-title glow-text">{article.title}</h1>
        <p className="article-detail-lead">{article.excerpt}</p>

        {/* Author Bio Callout */}
        <div className="author-signature-block">
          <Award className="signature-icon gold-glow-icon" />
          <div className="signature-details">
            <span className="signature-label">PUBLISHED BY</span>
            <span className="signature-name gold-gradient-text">{article.author}</span>
          </div>
        </div>

        {/* Article Content Body (HTML safely outputted) */}
        <div 
          className="article-body-content"
          dangerouslySetInnerHTML={{ __html: article.bodyHtml || article.contentHtml }}
        />
      </article>

      {/* Discussion Thread Section */}
      <section className="article-discussion-section royal-card">
        <h3 className="discussion-heading">
          <MessageSquare size={20} className="gold-glow-icon" /> Academic Discourse
        </h3>

        {/* Comment input form */}
        {user ? (
          <form onSubmit={handleAddComment} className="add-comment-form">
            <input
              type="text"
              className="royal-input comment-input"
              placeholder="Contribute your intellectual insight to the thread..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              required
            />
            <button type="submit" className="royal-btn comment-submit-btn" id="article-detail-comment-btn">
              <Send size={14} /> Submit
            </button>
          </form>
        ) : (
          <div className="discussion-prompt-card">
            <p>Please enter the Royal Salon to participate in academic discussions.</p>
          </div>
        )}

        {/* Comments list feed */}
        <div className="comments-list-feed">
          {comments.map((comment) => (
            <div key={comment.id} className="comment-feed-item">
              <div className="comment-item-header">
                <span className="comment-author">{comment.author}</span>
                <span className="comment-date">{comment.date}</span>
              </div>
              <p className="comment-text">"{comment.content}"</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ArticleDetailPage;
