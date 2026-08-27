import re

with open('frontend/src/components/shared/ContinuousScannerAnimation.jsx', 'r') as f:
    content = f.read()

bad_timer = '''      if (phaseTime < 6) setPhase(0);
      else if (phaseTime < 11) setPhase(1);
      else if (phaseTime < 16) setPhase(2);
      else setPhase(3);'''

good_timer = '''      if (isReturn) {
        if (phaseTime < 5) setPhase(0);
        else if (phaseTime < 10) setPhase(1);
        else if (phaseTime < 15) setPhase(2);
        else setPhase(3);
      } else {
        if (phaseTime < 6) setPhase(0);
        else if (phaseTime < 11) setPhase(1);
        else if (phaseTime < 16) setPhase(2);
        else setPhase(3);
      }'''

content = content.replace(bad_timer, good_timer)

bad_captions = '''  const getInstructionText = () => {
    if (isReturn) {
      if (type === 'nfc') {
        if (phase === 0) return t('catalog.animNfcTap', 'Tap phone on book cover');
        if (phase === 1) return t('catalog.animReturnComplete', 'Return complete!');
        if (phase === 2) return t('catalog.animPlaceBack', 'Place book on shelf');
        return t('catalog.animFindShelf', 'Find the correct shelf');
      } else {
        if (phase === 0) return t('catalog.animScanReturnQr', 'Scan return QR code');
        if (phase === 1) return t('catalog.animReturnComplete', 'Return complete!');
        if (phase === 2) return t('catalog.animPlaceBack', 'Place book on shelf');
        return t('catalog.animFindShelf', 'Find the correct shelf');
      }
    } else {
      if (type === 'barcode') {
        if (phase === 0) return t('catalog.animFindBook', 'Find and pick up the book from the shelf');
        if (phase === 1) return t('catalog.animFlipBook', 'Flip to the back cover');
        if (phase === 2) return 'Point camera at the QR sticker';
        return t('catalog.animCheckoutComplete', 'Checkout complete!');
      } else {
        if (phase === 0) return t('catalog.animFindBook', 'Find and pick up the book from the shelf');
        if (phase === 1) return 'Hold the front cover facing you';
        if (phase === 2) return 'Tap your phone on the top-left NFC logo';
        return t('catalog.animCheckoutComplete', 'Checkout complete!');
      }
    }
  };'''

good_captions = '''  const getInstructionText = () => {
    if (isReturn) {
      if (type === 'nfc') {
        if (phase === 0) return t('catalog.animNfcTap', 'Tap phone on book cover');
        if (phase === 1) return t('catalog.animReturnComplete', 'Return complete!');
        if (phase === 2) return t('catalog.animPlaceBack', 'Place book on shelf');
        return t('catalog.animFindShelf', 'Find the correct shelf');
      } else {
        if (phase === 0) return t('catalog.animScanReturnQr', 'Scan return QR code');
        if (phase === 1) return t('catalog.animReturnComplete', 'Return complete!');
        if (phase === 2) return t('catalog.animPlaceBack', 'Place book on shelf');
        return t('catalog.animFindShelf', 'Find the correct shelf');
      }
    } else {
      if (type === 'barcode') {
        if (phase === 0) return t('catalog.animFindBook', 'Find and pick up the book');
        if (phase === 1) return t('catalog.animScanQr', 'Scan library QR code');
        if (phase === 2) return t('catalog.animCheckoutComplete', 'Checkout complete!');
        return t('catalog.animTakeBook', 'Enjoy reading your book!');
      } else {
        if (phase === 0) return t('catalog.animFindBook', 'Find and pick up the book');
        if (phase === 1) return t('catalog.animNfcTap', 'Tap phone on book cover');
        if (phase === 2) return t('catalog.animCheckoutComplete', 'Checkout complete!');
        return t('catalog.animTakeBook', 'Enjoy reading your book!');
      }
    }
  };'''

content = content.replace(bad_captions, good_captions)

with open('frontend/src/components/shared/ContinuousScannerAnimation.jsx', 'w') as f:
    f.write(content)
