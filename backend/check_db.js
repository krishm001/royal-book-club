const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function check() {
  const users = await db.collection('users').get();
  console.log(`Users: ${users.size}`);
  let testUsers = 0;
  users.forEach(doc => {
    if (doc.data().isTest) testUsers++;
  });
  console.log(`Users with isTest=true: ${testUsers}`);

  const checkouts = await db.collection('checkouts').get();
  console.log(`Checkouts: ${checkouts.size}`);
  let testCheckouts = 0;
  checkouts.forEach(doc => {
    if (doc.data().isTest) testCheckouts++;
  });
  console.log(`Checkouts with isTest=true: ${testCheckouts}`);
}
check().catch(console.error);
