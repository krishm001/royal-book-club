import re

with open('frontend/src/components/shared/ContinuousScanner.css', 'r') as f:
    content = f.read()

replacements = {
    '''@keyframes bookCheckoutBarcode {
  0%, 10% { transform: translate3d(-15px, 10px, -150px) rotateY(90deg); }
  18%, 22% { transform: translate3d(-15px, 10px, 0px) rotateY(90deg); }
  28%, 35% { transform: translate3d(0px, 0px, 50px) rotateY(0deg); }
  42%, 50% { transform: translate3d(0px, 0px, 50px) rotateY(-180deg); }
  55%, 88% { transform: translate3d(45px, 0px, 20px) rotateY(-210deg) rotateX(10deg); }
  95%, 100% { transform: translate3d(-15px, 10px, -150px) rotateY(90deg); }
}''': '''@keyframes bookCheckoutBarcode {
  0%, 8% { transform: translate3d(-15px, 10px, -150px) rotateY(90deg); }
  12%, 15% { transform: translate3d(-15px, 10px, 0px) rotateY(90deg); }
  22%, 30% { transform: translate3d(0px, 0px, 50px) rotateY(-180deg); }
  35%, 80% { transform: translate3d(45px, 0px, 20px) rotateY(-210deg) rotateX(10deg); }
  85%, 100% { transform: translate3d(-15px, 10px, -150px) rotateY(90deg); }
}''',

    '''@keyframes bookCheckoutNfc {
  0%, 10% { transform: translate3d(-15px, 10px, -150px) rotateY(90deg); }
  18%, 22% { transform: translate3d(-15px, 10px, 0px) rotateY(90deg); }
  28%, 45% { transform: translate3d(0px, 0px, 50px) rotateY(0deg); }
  52%, 88% { transform: translate3d(20px, 10px, 20px) rotateY(-15deg) rotateX(20deg); }
  95%, 100% { transform: translate3d(-15px, 10px, -150px) rotateY(90deg); }
}''': '''@keyframes bookCheckoutNfc {
  0%, 8% { transform: translate3d(-15px, 10px, -150px) rotateY(90deg); }
  12%, 15% { transform: translate3d(-15px, 10px, 0px) rotateY(90deg); }
  22%, 30% { transform: translate3d(0px, 0px, 50px) rotateY(0deg); }
  35%, 80% { transform: translate3d(20px, 10px, 20px) rotateY(-15deg) rotateX(20deg); }
  85%, 100% { transform: translate3d(-15px, 10px, -150px) rotateY(90deg); }
}''',

    '''@keyframes bookReturnBarcode {
  0%, 5% { transform: translate3d(45px, 0, 20px) rotateY(-210deg) rotateX(10deg); }
  10%, 40% { transform: translate3d(45px, 0, 20px) rotateY(-210deg) rotateX(10deg); }
  55%, 65% { transform: translate3d(0, 0, 50px) rotateY(-180deg); }
  72%, 80% { transform: translate3d(-15px, 10px, 0px) rotateY(90deg); }
  85%, 92% { transform: translate3d(-15px, 10px, -150px) rotateY(90deg); }
  95%, 100% { transform: translate3d(45px, 0, 20px) rotateY(-210deg) rotateX(10deg); }
}''': '''@keyframes bookReturnBarcode {
  0%, 50% { transform: translate3d(45px, 0px, 20px) rotateY(-210deg) rotateX(10deg); }
  55%, 65% { transform: translate3d(0px, 0px, 50px) rotateY(-180deg); }
  75%, 85% { transform: translate3d(-15px, 10px, 0px) rotateY(90deg); }
  90%, 100% { transform: translate3d(-15px, 10px, -150px) rotateY(90deg); }
}''',

    '''@keyframes bookReturnNfc {
  0%, 5% { transform: translate3d(20px, 10px, 20px) rotateY(-15deg) rotateX(20deg); }
  10%, 40% { transform: translate3d(20px, 10px, 20px) rotateY(-15deg) rotateX(20deg); }
  55%, 65% { transform: translate3d(0, 0, 50px) rotateY(0deg); }
  72%, 80% { transform: translate3d(-15px, 10px, 0px) rotateY(90deg); }
  85%, 92% { transform: translate3d(-15px, 10px, -150px) rotateY(90deg); }
  95%, 100% { transform: translate3d(20px, 10px, 20px) rotateY(-15deg) rotateX(20deg); }
}''': '''@keyframes bookReturnNfc {
  0%, 50% { transform: translate3d(20px, 10px, 20px) rotateY(-15deg) rotateX(20deg); }
  55%, 65% { transform: translate3d(0px, 0px, 50px) rotateY(0deg); }
  75%, 85% { transform: translate3d(-15px, 10px, 0px) rotateY(90deg); }
  90%, 100% { transform: translate3d(-15px, 10px, -150px) rotateY(90deg); }
}'''
}

for old, new in replacements.items():
    content = content.replace(old, new)

with open('frontend/src/components/shared/ContinuousScanner.css', 'w') as f:
    f.write(content)
