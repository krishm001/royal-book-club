import re

with open('frontend/src/components/shared/ContinuousScanner.css', 'r') as f:
    content = f.read()

# Fix phone checkout barcode
content = re.sub(
    r'@keyframes phoneCheckoutBarcode \{[^\}]*\}',
    '''@keyframes phoneCheckoutBarcode {
  0%, 30% { transform: translate3d(-200px, 0, 0); opacity: 0; }
  35%, 80% { transform: translate3d(-70px, 0, 80px) rotateY(-30deg); opacity: 1; }
  85%, 100% { transform: translate3d(-200px, 0, 0); opacity: 0; }
}''', content
)

# Fix phone checkout nfc
content = re.sub(
    r'@keyframes phoneCheckoutNfc \{[^\}]*\}',
    '''@keyframes phoneCheckoutNfc {
  0%, 30% { transform: translate3d(-100px, -100px, 0); opacity: 0; }
  35%, 80% { transform: translate3d(-30px, -50px, 80px) rotateX(-45deg) rotateY(15deg); opacity: 1; }
  85%, 100% { transform: translate3d(-100px, -100px, 0); opacity: 0; }
}''', content
)

# Fix book checkout barcode
content = re.sub(
    r'@keyframes bookCheckoutBarcode \{[^\}]*\}',
    '''@keyframes bookCheckoutBarcode {
  0%, 8% { transform: translate3d(-15px, 10px, -150px) rotateY(90deg); }
  12%, 15% { transform: translate3d(-15px, 10px, 0px) rotateY(90deg); }
  22%, 30% { transform: translate3d(0px, 0px, 50px) rotateY(-180deg); }
  35%, 80% { transform: translate3d(45px, 0px, 20px) rotateY(-210deg) rotateX(10deg); }
  85%, 100% { transform: translate3d(-15px, 10px, -150px) rotateY(90deg); }
}''', content
)

# Fix book checkout nfc (front cover, then tilt for phone)
content = re.sub(
    r'@keyframes bookCheckoutNfc \{[^\}]*\}',
    '''@keyframes bookCheckoutNfc {
  0%, 8% { transform: translate3d(-15px, 10px, -150px) rotateY(90deg); }
  12%, 15% { transform: translate3d(-15px, 10px, 0px) rotateY(90deg); }
  22%, 30% { transform: translate3d(0px, 0px, 50px) rotateY(0deg); }
  35%, 80% { transform: translate3d(20px, 10px, 20px) rotateY(-15deg) rotateX(20deg); }
  85%, 100% { transform: translate3d(-15px, 10px, -150px) rotateY(90deg); }
}''', content
)

# For return barcode, the scan is 0-25% (0-5s), success is 25-50% (5-10s), place back is 50-75% (10-15s).
# Phone return barcode
content = re.sub(
    r'@keyframes phoneReturnBarcode \{[^\}]*\}',
    '''@keyframes phoneReturnBarcode {
  0%, 2% { transform: translate3d(-200px, 0, 0); opacity: 0; }
  5%, 50% { transform: translate3d(-70px, 0, 80px) rotateY(-30deg); opacity: 1; }
  55%, 100% { transform: translate3d(-200px, 0, 0); opacity: 0; }
}''', content
)
# Phone return nfc
content = re.sub(
    r'@keyframes phoneReturnNfc \{[^\}]*\}',
    '''@keyframes phoneReturnNfc {
  0%, 2% { transform: translate3d(-100px, -100px, 0); opacity: 0; }
  5%, 50% { transform: translate3d(-30px, -50px, 80px) rotateX(-45deg) rotateY(15deg); opacity: 1; }
  55%, 100% { transform: translate3d(-100px, -100px, 0); opacity: 0; }
}''', content
)

# Book return barcode (start tilted back, then shelf)
content = re.sub(
    r'@keyframes bookReturnBarcode \{[^\}]*\}',
    '''@keyframes bookReturnBarcode {
  0%, 50% { transform: translate3d(45px, 0px, 20px) rotateY(-210deg) rotateX(10deg); }
  55%, 65% { transform: translate3d(0px, 0px, 50px) rotateY(-180deg); }
  75%, 85% { transform: translate3d(-15px, 10px, 0px) rotateY(90deg); }
  90%, 100% { transform: translate3d(-15px, 10px, -150px) rotateY(90deg); }
}''', content
)
# Book return nfc
content = re.sub(
    r'@keyframes bookReturnNfc \{[^\}]*\}',
    '''@keyframes bookReturnNfc {
  0%, 50% { transform: translate3d(20px, 10px, 20px) rotateY(-15deg) rotateX(20deg); }
  55%, 65% { transform: translate3d(0px, 0px, 50px) rotateY(0deg); }
  75%, 85% { transform: translate3d(-15px, 10px, 0px) rotateY(90deg); }
  90%, 100% { transform: translate3d(-15px, 10px, -150px) rotateY(90deg); }
}''', content
)

with open('frontend/src/components/shared/ContinuousScanner.css', 'w') as f:
    f.write(content)
