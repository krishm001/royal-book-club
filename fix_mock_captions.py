import re

with open('frontend/src/components/shared/ContinuousScannerAnimation.jsx', 'r') as f:
    content = f.read()

content = content.replace("Scan return QR code", "{t('catalog.animScanReturnQr', 'Scan return QR code')}")
content = content.replace("Scan library QR code", "{t('catalog.animScanQr', 'Scan library QR code')}")
content = content.replace("Tap phone on book cover", "{t('catalog.animNfcTap', 'Tap phone on book cover')}")
content = content.replace("Checkout complete!", "{t('catalog.animCheckoutComplete', 'Checkout complete!')}")
content = content.replace("A physical possession barcode or NFC match has been registered.", "{t('catalog.p2dDesc', 'A physical possession barcode or NFC match has been registered.')}")
content = content.replace("CONFIRM", "{t('common.confirm', 'CONFIRM')}")
content = content.replace("Royal Verification Confirmed", "{t('catalog.royalVerification', 'Royal Verification Confirmed')}")
content = content.replace("How was your experience?", "{t('catalog.howExperience', 'How was your experience?')}")
content = content.replace("WRITE REVIEW", "{t('catalog.writeReview', 'WRITE REVIEW')}")
content = content.replace("VIEW GATEPASS", "{t('catalog.viewGatepass', 'VIEW GATEPASS')}")

with open('frontend/src/components/shared/ContinuousScannerAnimation.jsx', 'w') as f:
    f.write(content)
