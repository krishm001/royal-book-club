import re

with open('frontend/src/components/shared/ContinuousScanner.css', 'r') as f:
    content = f.read()

content = re.sub(
    r'@keyframes bookCheckoutBarcode \{[\s\S]*?\}',
    '''@keyframes bookCheckoutBarcode {
  0%, 8% { transform: translate3d(-15px, 10px, -150px) rotateY(90deg); }
  12%, 15% { transform: translate3d(-15px, 10px, 0px) rotateY(90deg); }
  22%, 30% { transform: translate3d(0px, 0px, 50px) rotateY(-180deg); }
  35%, 80% { transform: translate3d(45px, 0px, 20px) rotateY(-210deg) rotateX(10deg); }
  85%, 100% { transform: translate3d(-15px, 10px, -150px) rotateY(90deg); }
}''', content, 1
)

content = re.sub(
    r'@keyframes bookCheckoutNfc \{[\s\S]*?\}',
    '''@keyframes bookCheckoutNfc {
  0%, 8% { transform: translate3d(-15px, 10px, -150px) rotateY(90deg); }
  12%, 15% { transform: translate3d(-15px, 10px, 0px) rotateY(90deg); }
  22%, 30% { transform: translate3d(0px, 0px, 50px) rotateY(0deg); }
  35%, 80% { transform: translate3d(20px, 10px, 20px) rotateY(-15deg) rotateX(20deg); }
  85%, 100% { transform: translate3d(-15px, 10px, -150px) rotateY(90deg); }
}''', content, 1
)

content = re.sub(
    r'@keyframes bookReturnBarcode \{[\s\S]*?\}',
    '''@keyframes bookReturnBarcode {
  0%, 50% { transform: translate3d(45px, 0px, 20px) rotateY(-210deg) rotateX(10deg); }
  55%, 65% { transform: translate3d(0px, 0px, 50px) rotateY(-180deg); }
  75%, 85% { transform: translate3d(-15px, 10px, 0px) rotateY(90deg); }
  90%, 100% { transform: translate3d(-15px, 10px, -150px) rotateY(90deg); }
}''', content, 1
)

content = re.sub(
    r'@keyframes bookReturnNfc \{[\s\S]*?\}',
    '''@keyframes bookReturnNfc {
  0%, 50% { transform: translate3d(20px, 10px, 20px) rotateY(-15deg) rotateX(20deg); }
  55%, 65% { transform: translate3d(0px, 0px, 50px) rotateY(0deg); }
  75%, 85% { transform: translate3d(-15px, 10px, 0px) rotateY(90deg); }
  90%, 100% { transform: translate3d(-15px, 10px, -150px) rotateY(90deg); }
}''', content, 1
)

with open('frontend/src/components/shared/ContinuousScanner.css', 'w') as f:
    f.write(content)
