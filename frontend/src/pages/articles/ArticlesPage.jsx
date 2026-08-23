import { useLanguage } from '../../i18n/LanguageContext';
import React, { useState } from 'react';
import { BookText, Sparkles, Search, ChevronRight, PenTool } from 'lucide-react';
import { Link } from 'react-router-dom';
import RichTextEditor from '../../components/shared/RichTextEditor';
import './ArticlesPage.css';
const ArticlesPage = ({
  user
}) => {
  const {
    t
  } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const [articles, setArticles] = useState([{
    id: 'article-1',
    title: 'The Hedonistic Tapestry of Oscar Wilde',
    excerpt: 'An in-depth critique of artistic morality in Victorian England, analyzing the underlying themes of decay and aesthetic idealism.',
    author: 'Archduke of Prose',
    date: 'May 28, 2026',
    readTime: '6 min read',
    category: 'Critique',
    coverUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=600&q=80'
  }, {
    id: 'article-2',
    title: 'Dante’s Architectural Afterlife',
    excerpt: 'A comprehensive study examining the spatial layout of Dante’s Inferno as a reflection of medieval cosmic geometry.',
    author: 'Lady Chesterfield',
    date: 'May 14, 2026',
    readTime: '10 min read',
    category: 'Research',
    coverUrl: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=600&q=80'
  }, {
    id: 'article-3',
    title: 'Mary Shelley and the Modern Prometheus',
    excerpt: 'Reflecting on technological hubris and scientific boundary violations in modern biological innovations.',
    author: 'Eminent Alchemist',
    date: 'Apr 29, 2026',
    readTime: '8 min read',
    category: 'Philosophy',
    coverUrl: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=600&q=80'
  }]);
  const handlePublishArticle = (draftTitle, draftContent) => {
    const newArticle = {
      id: `article-${Date.now()}`,
      title: draftTitle || 'Untitled Dissertation',
      excerpt: 'A freshly published sovereign literary critique.',
      author: user?.displayName || 'Sovereign Patron',
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      readTime: '4 min read',
      category: 'Critique',
      coverUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80',
      contentHtml: draftContent
    };
    setArticles([newArticle, ...articles]);
    setIsDrafting(false);
  };
  const filteredArticles = articles.filter(art => art.title.toLowerCase().includes(searchQuery.toLowerCase()) || art.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) || art.author.toLowerCase().includes(searchQuery.toLowerCase()));
  return <div className="articles-container animate-fade-in">
      {/* Page Header */}
      <header className="articles-header">
        <div className="header-badge">
          <Sparkles size={14} className="gold-glow-icon" />
          <span className="gold-gradient-text">{t('auto_3457', 'SOVEREIGN ESSAYS & DISSERTATIONS')}</span>
        </div>
        <h1 className="articles-title glow-text">{t('auto_3458', 'Intellectual Archives')}</h1>
        <p className="articles-subtitle">
          {t('auto_3459', 'Delve into deep literary critiques, symbolist philosophical theses, and classical research papers penned by our salon scholars.')}
        </p>
      </header>

      {/* Write a Dissertation section */}
      {user && <section className="drafting-section-control">
          {!isDrafting ? <button onClick={() => setIsDrafting(true)} className="royal-btn draft-trigger-btn" id="draft-dissertation-btn">
              <PenTool size={16} /> {t('auto_3460', 'Compose New Dissertation')}
            </button> : <div className="royal-card dynamic-drafting-card animate-fade-in">
              <div className="draft-header">
                <h3>{t('auto_3461', 'New Literary Submission')}</h3>
                <button onClick={() => setIsDrafting(false)} className="cancel-draft-btn">{t('auto_3462', 'Cancel')}</button>
              </div>
              <RichTextEditor onPublish={handlePublishArticle} />
            </div>}
        </section>}

      {/* Search and List */}
      <section className="articles-search-bar royal-card">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={18} />
          <input type="text" placeholder={t("str_5373", "Search essays by title, keyword, or author...")} className="royal-input search-input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
      </section>

      {/* Articles Feed */}
      <main className="articles-grid-main">
        {filteredArticles.length > 0 ? <div className="articles-list-grid">
            {filteredArticles.map(art => <div key={art.id} className="royal-card article-list-card" id={`article-card-${art.id}`}>
                <div className="article-list-img-frame">
                  <img src={art.coverUrl} alt={art.title} className="article-list-img" />
                </div>
                <div className="article-list-content">
                  <div className="article-meta-row">
                    <span className="art-category-badge">{art.category}</span>
                    <span className="art-meta-date">{art.date}</span>
                    <span className="art-meta-divider">•</span>
                    <span className="art-meta-read">{art.readTime}</span>
                  </div>
                  <h3 className="article-list-title">{art.title}</h3>
                  <p className="article-list-excerpt">{art.excerpt}</p>
                  <div className="article-list-footer">
                    <span className="art-author-info">{t("str_5374", "by")} <strong className="gold-gradient-text">{art.author}</strong></span>
                    <Link to={`/articles/${art.id}`} className="read-more-btn" id={`read-more-btn-${art.id}`}>
                      {t('auto_3463', 'Read Essay')} <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>)}
          </div> : <div className="royal-card no-articles-card">
            <BookText size={48} className="no-articles-icon" />
            <h3>{t('auto_3464', 'No Essays Found')}</h3>
            <p>{t('auto_3465', 'No dissertations were found matching your terms. Be the first to publish a new critique!')}</p>
          </div>}
      </main>
    </div>;
};
export default ArticlesPage;