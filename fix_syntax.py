import re

with open('frontend/src/components/shared/ContinuousScannerAnimation.jsx', 'r') as f:
    content = f.read()

content = content.replace("{isReturn ? '{t('common.confirm', 'CONFIRM')} RETURN' : '{t('common.confirm', 'CONFIRM')} CHECKOUT'}", "{isReturn ? t('common.confirm', 'CONFIRM') + ' RETURN' : t('common.confirm', 'CONFIRM') + ' CHECKOUT'}")

with open('frontend/src/components/shared/ContinuousScannerAnimation.jsx', 'w') as f:
    f.write(content)
import re

with open('frontend/src/components/shared/ContinuousScannerAnimation.jsx', 'r') as f:
    content = f.read()

content = content.replace("{isReturn ? '{t(\\'catalog.writeReview\\', \\'WRITE REVIEW\\')}' : '{t(\\'catalog.viewGatepass\\', \\'VIEW GATEPASS\\')}'}", "{isReturn ? t('catalog.writeReview', 'WRITE REVIEW') : t('catalog.viewGatepass', 'VIEW GATEPASS')}")

with open('frontend/src/components/shared/ContinuousScannerAnimation.jsx', 'w') as f:
    f.write(content)
