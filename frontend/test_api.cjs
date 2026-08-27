const axios = require('axios');
(async () => {
  try {
    const res = await axios.get('http://localhost:8080/api/v1/books/0440296005');
    console.log(res.data);
  } catch (e) {
    console.error(e.message);
  }
})();
