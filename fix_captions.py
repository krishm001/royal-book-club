import re

with open('frontend/src/components/shared/ContinuousScannerAnimation.jsx', 'r') as f:
    content = f.read()

bad_instruction = '''  const getInstructionText = () => {
    if (isReturn) {
      if (type === 'nfc') {
        if (phase === 0) return 'Tap phone on book cover';
        if (phase === 1) return 'Return complete!';
        if (phase === 2) return 'Place book on shelf';
        return 'Find the correct shelf';
      } else {
        if (phase === 0) return 'Scan return QR code';
        if (phase === 1) return 'Return complete!';
        if (phase === 2) return 'Place book on shelf';
        return 'Find the correct shelf';
      }
    } else {
      if (type === 'nfc') {
        if (phase === 0) return 'Pick up the book';
        if (phase === 1) return 'Flip to front cover';
        if (phase === 2) return 'Tap phone on cover';
        return 'Checkout complete!';
      } else {
        if (phase === 0) return 'Pick up the book';
        if (phase === 1) return 'Flip to back cover';
        if (phase === 2) return 'Scan library QR code';
        return 'Checkout complete!';
      }
    }
  };'''

good_instruction = '''  const getInstructionText = () => {
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
      if (type === 'nfc') {
        if (phase === 0) return t('catalog.animPickUp', 'Pick up the book');
        if (phase === 1) return t('catalog.animFlipFront', 'Flip to front cover');
        if (phase === 2) return t('catalog.animNfcTap', 'Tap phone on cover');
        return t('catalog.animCheckoutComplete', 'Checkout complete!');
      } else {
        if (phase === 0) return t('catalog.animPickUp', 'Pick up the book');
        if (phase === 1) return t('catalog.animFlipBack', 'Flip to back cover');
        if (phase === 2) return t('catalog.animScanQr', 'Scan library QR code');
        return t('catalog.animCheckoutComplete', 'Checkout complete!');
      }
    }
  };'''

content = content.replace(bad_instruction, good_instruction)

with open('frontend/src/components/shared/ContinuousScannerAnimation.jsx', 'w') as f:
    f.write(content)
