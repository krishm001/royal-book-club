const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('/Users/deepikakumari/royalbookclub/backend/firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function fixInventory() {
  console.log("Fetching all books and checkouts...");
  
  const booksSnap = await db.collection('books').get();
  const checkoutsSnap = await db.collection('checkouts').get();
  
  const activeCheckouts = checkoutsSnap.docs.map(d => ({id: d.id, ...d.data()}))
    .filter(c => ['CHECKED_OUT', 'REQUESTED_CHECKOUT', 'REQUESTED_RETURN'].includes(c.status));
    
  console.log(`Found ${booksSnap.size} books and ${activeCheckouts.length} active checkouts.`);
  
  let fixedCount = 0;
  
  for (const bookDoc of booksSnap.docs) {
    const book = bookDoc.data();
    const isbn = bookDoc.id;
    
    // Find active checkouts for this book
    const bookCheckouts = activeCheckouts.filter(c => c.bookId === isbn || c.bookId === book.isbn);
    const checkedOutCopyNos = new Set(bookCheckouts.filter(c => c.copyNo != null).map(c => c.copyNo));
    
    let totalCopies = book.totalCopies || 1;
    let copies = book.copies || [];
    
    if (copies.length === 0) {
      for (let i = 1; i <= totalCopies; i++) {
        copies.push({
          copyNo: i,
          status: 'AVAILABLE'
        });
      }
    }
    
    let availableCount = 0;
    let copiesModified = false;
    
    for (const copy of copies) {
      const isActive = checkedOutCopyNos.has(copy.copyNo);
      let expectedStatus = isActive ? 'CHECKED_OUT' : 'AVAILABLE'; 
      
      if (copy.status !== expectedStatus && !isActive && !['LOST', 'DAMAGED'].includes(copy.status)) {
         copy.status = 'AVAILABLE';
         delete copy.currentCheckoutId;
         copiesModified = true;
      } else if (isActive) {
         if (['AVAILABLE', 'LOST', 'DAMAGED'].includes(copy.status)) {
            copy.status = 'CHECKED_OUT';
            copiesModified = true;
         }
      }
      
      if (copy.status === 'AVAILABLE') {
        availableCount++;
      }
    }
    
    let lostCount = copies.filter(c => ['LOST', 'DAMAGED'].includes(c.status)).length;
    let trueAvailable = totalCopies - bookCheckouts.length - lostCount;
    if (trueAvailable < 0) trueAvailable = 0;
    
    if (book.availableCopies !== trueAvailable || copiesModified) {
       console.log(`Fixing ${isbn} (${book.title}): availableCopies ${book.availableCopies} -> ${trueAvailable}`);
       await db.collection('books').doc(isbn).update({
         availableCopies: trueAvailable,
         copies: copies
       });
       fixedCount++;
    }
  }
  
  console.log(`Fixed ${fixedCount} books successfully.`);
  process.exit(0);
}

fixInventory().catch(console.error);
