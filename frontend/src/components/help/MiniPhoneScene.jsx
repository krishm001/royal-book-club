import React from 'react';
import OnboardingWizard from '../OnboardingWizard';
import BookCard from '../shared/BookCard';
import { BookOpen, Wifi, QrCode, Search, Menu, LogIn, ChevronRight, MapPin, Compass } from 'lucide-react';

const MOCK_BOOK = {
  id: 'b1', title: 'The Royal Gardens', author: 'A. Hawthorne', 
  coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=300&h=440',
  status: 'available', synopsis: 'A beautiful book.', rating: 4.5, genre: 'Classics',
  copiesTotal: 3, copiesAvailable: 3
};

const MiniPhoneScene = ({ sceneId }) => {
  const innerStyle = {
    width: 393,
    height: 852,
    position: 'absolute',
    top: 0,
    left: 0,
    background: 'var(--bg-main)',
    overflow: 'hidden',
    transform: 'scale(0.39)', // Scale down to fit inside the 154px width phone screen
    transformOrigin: 'top left',
    pointerEvents: 'none' // Prevent interactions inside the mock
  };

  const Header = () => (
    <div style={{height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)'}}>
       <Menu size={24} color="var(--text-primary)" />
       <h1 style={{fontSize: 20, margin: 0, fontFamily: 'Playfair Display'}}>Royal Book Club</h1>
       <div style={{width: 32, height: 32, borderRadius: 16, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><LogIn size={16} color="white"/></div>
    </div>
  );

  const renderScene = () => {
    // 01_catalog_page
    if (sceneId === '01_catalog_page') {
      return (
        <div style={{height: '100%', background: 'var(--bg-main)'}}>
          <Header />
          <div style={{padding: 20}}>
            <h2 style={{fontFamily: 'Playfair Display', fontSize: 32, marginBottom: 20, color: 'var(--text-primary)'}}>The Study</h2>
            <BookCard book={MOCK_BOOK} onClick={()=>{}} />
            <BookCard book={{...MOCK_BOOK, title: 'Meditations', coverUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=300&h=440'}} onClick={()=>{}} />
          </div>
        </div>
      );
    }
    
    // Auth & Onboarding
    const authScenes = {
      '02_onboarding_signin': null,
      '03_onboarding_signup': null,
      '04_onboarding_terms': 'TERMS',
      '05_onboarding_email_verify': 'EMAIL_VERIFY',
      '06_onboarding_profile': 'PROFILE'
    };
    
    if (sceneId in authScenes) {
      const ts = authScenes[sceneId];
      return (
        <div style={{height: '100%'}}>
          <Header />
          <div style={{padding: 20}}>
             <BookCard book={MOCK_BOOK} onClick={()=>{}} />
          </div>
          {/* Overlay onboarding */}
          <div style={{position: 'absolute', inset: 0, zIndex: 1000}}>
             <OnboardingWizard onClose={()=>{}} targetState={ts} user={ts ? {uid: '123', email: 'test@example.com', emailVerified: ts==='PROFILE'} : null} />
          </div>
        </div>
      );
    }
    
    // 07_book_detail_page and 08_book_detail_nfc_instant
    if (sceneId.startsWith('07_book') || sceneId.startsWith('08_book')) {
      return (
        <div style={{height: '100%', background: 'var(--bg-main)'}}>
          <Header />
          <div style={{height: 300, background: 'linear-gradient(to bottom, var(--surface), var(--bg-main))', display: 'flex', justifyContent: 'center', padding: 20}}>
             <img src={MOCK_BOOK.coverUrl} style={{height: '100%', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.2)'}} />
          </div>
          <div style={{padding: 20, marginTop: -20, background: 'var(--bg-main)', borderTopLeftRadius: 24, borderTopRightRadius: 24, position: 'relative'}}>
             <h2 style={{fontFamily: 'Playfair Display', fontSize: 28, margin: '0 0 10px'}}>{MOCK_BOOK.title}</h2>
             <p style={{color: 'var(--text-secondary)', fontSize: 18}}>{MOCK_BOOK.author}</p>
             
             {sceneId === '08_book_detail_nfc_instant' ? (
                <button style={{width: '100%', padding: 20, background: 'var(--success)', color: 'white', border: 'none', borderRadius: 12, fontSize: 18, fontWeight: 600, marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                   Instant Checkout
                   <Wifi size={24} />
                </button>
             ) : (
                <button style={{width: '100%', padding: 20, background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 12, fontSize: 18, fontWeight: 600, marginTop: 20}}>
                   Checkout Book
                </button>
             )}
          </div>
        </div>
      );
    }
    
    // Scanner Modal
    if (sceneId === '09_scanner_modal_nfc' || sceneId === '10_scanner_modal_qr') {
      const isNFC = sceneId === '09_scanner_modal_nfc';
      return (
        <div style={{height: '100%', background: 'var(--bg-main)'}}>
          <Header />
          <div style={{padding: 20, filter: 'blur(4px)'}}>
            <BookCard book={MOCK_BOOK} onClick={()=>{}} />
          </div>
          <div style={{position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100}} />
          <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--surface)', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, zIndex: 101, minHeight: 400}}>
             <h3 style={{fontSize: 22, marginBottom: 20}}>Verify Physical Book</h3>
             <div style={{display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20}}>
                <div style={{flex: 1, padding: 15, textAlign: 'center', borderBottom: isNFC ? '3px solid var(--accent)' : 'none', color: isNFC ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: isNFC ? 600 : 400}}>NFC Tap</div>
                <div style={{flex: 1, padding: 15, textAlign: 'center', borderBottom: !isNFC ? '3px solid var(--accent)' : 'none', color: !isNFC ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: !isNFC ? 600 : 400}}>QR Scan</div>
             </div>
             <div style={{height: 250, background: 'var(--bg-main)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 15}}>
                {isNFC ? <Wifi size={64} color="var(--accent)" /> : <QrCode size={64} color="var(--text-secondary)" />}
                <p style={{color: 'var(--text-secondary)', width: '80%', textAlign: 'center'}}>
                  {isNFC ? 'Hold your phone near the top-left corner of the book.' : 'Point your camera at the QR code on the back cover.'}
                </p>
             </div>
          </div>
        </div>
      );
    }
    
    // Checkout Success
    if (sceneId === '11_checkout_success') {
      return (
        <div style={{height: '100%', background: 'var(--success)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'white'}}>
           <div style={{width: 100, height: 100, background: 'white', borderRadius: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 30}}>
              <BookOpen size={50} color="var(--success)" />
           </div>
           <h2 style={{fontSize: 32, textAlign: 'center', marginBottom: 15}}>Checkout Confirmed</h2>
           <p style={{fontSize: 18, textAlign: 'center', opacity: 0.9, marginBottom: 40}}>Enjoy reading {MOCK_BOOK.title}</p>
           <button style={{width: '100%', padding: 20, background: 'white', color: 'var(--success)', border: 'none', borderRadius: 12, fontSize: 18, fontWeight: 600}}>
              View Gatepass
           </button>
        </div>
      );
    }
    
    // Gatepass
    if (sceneId === '12_gatepass_page') {
      return (
        <div style={{height: '100%', background: 'var(--bg-main)', padding: 20, display: 'flex', flexDirection: 'column'}}>
           <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 30}}>
             <h2 style={{fontFamily: 'Playfair Display', fontSize: 24}}>Gatepass</h2>
             <span style={{background: 'var(--success)', color: 'white', padding: '5px 12px', borderRadius: 20, fontSize: 14}}>Active</span>
           </div>
           <div style={{background: 'white', borderRadius: 16, padding: 30, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.1)'}}>
              <h3 style={{color: 'black', fontSize: 22, margin: '0 0 10px'}}>{MOCK_BOOK.title}</h3>
              <p style={{color: '#666', marginBottom: 40}}>Checkout ID: #RB-28492</p>
              <QrCode size={200} color="black" />
              <p style={{color: '#666', marginTop: 40, textAlign: 'center'}}>Show this screen at the exit gate.</p>
           </div>
        </div>
      );
    }
    
    // Return Scanner
    if (sceneId === '13_return_scanner') {
      return (
        <div style={{height: '100%', background: 'var(--bg-main)'}}>
          <Header />
          <div style={{padding: 20}}>
             <div style={{background: 'var(--surface)', borderRadius: 12, padding: 20, display: 'flex', gap: 15, marginBottom: 20}}>
                <img src={MOCK_BOOK.coverUrl} style={{width: 60, height: 90, borderRadius: 4}} />
                <div>
                   <h4 style={{margin: '0 0 5px', fontSize: 18}}>{MOCK_BOOK.title}</h4>
                   <p style={{margin: 0, color: 'var(--text-secondary)'}}>Due in 14 days</p>
                </div>
             </div>
             
             <h3 style={{fontSize: 20, margin: '30px 0 20px'}}>Verify Return</h3>
             <div style={{display: 'flex', flexDirection: 'column', gap: 15}}>
                <div style={{background: 'var(--surface)', pading: 20, borderRadius: 12, display: 'flex', alignItems: 'center', padding: 20}}>
                   <Wifi size={24} style={{marginRight: 15, color: 'var(--accent)'}} />
                   <span style={{fontSize: 18, flex: 1}}>NFC Tap Book</span>
                   <ChevronRight />
                </div>
                <div style={{background: 'var(--surface)', pading: 20, borderRadius: 12, display: 'flex', alignItems: 'center', padding: 20}}>
                   <QrCode size={24} style={{marginRight: 15, color: 'var(--text-secondary)'}} />
                   <span style={{fontSize: 18, flex: 1}}>QR Scan Desk</span>
                   <ChevronRight />
                </div>
                <div style={{background: 'var(--surface)', pading: 20, borderRadius: 12, display: 'flex', alignItems: 'center', padding: 20}}>
                   <MapPin size={24} style={{marginRight: 15, color: 'var(--text-secondary)'}} />
                   <span style={{fontSize: 18, flex: 1}}>GPS Location</span>
                   <ChevronRight />
                </div>
             </div>
          </div>
        </div>
      );
    }
    
    // Default placeholder
    return (
      <div style={{height: '100%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center'}}>
         <div>
            <BookOpen size={48} style={{marginBottom: 20, color: 'var(--text-secondary)'}} />
            <p>Mock UI for: {sceneId}</p>
         </div>
      </div>
    );
  };

  return (
    <div style={innerStyle}>
       {renderScene()}
    </div>
  );
};

export default MiniPhoneScene;
