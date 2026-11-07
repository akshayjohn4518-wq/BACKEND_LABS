
const http = require('http');
const { app, initializeDBAndServer } = require('./server');

const TEST_PORT = 3005;
process.env.PORT = TEST_PORT;

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: TEST_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('Running BDF Lab 2 Automated Test Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, received) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message} (Received: ${JSON.stringify(received)})`);
      failed++;
    }
  }

  const server = await initializeDBAndServer(TEST_PORT);

  try {

    console.log('Test A: GET /books/ (Retrieve all books)...');
    const resA = await makeRequest('GET', '/books/');
    assert(resA.statusCode === 200, 'Status code is 200 OK', resA.statusCode);
    assert(Array.isArray(resA.data), 'Response is a JSON array', typeof resA.data);
    assert(resA.data.length >= 10, 'Contains at least 10 seed books', resA.data.length);


    console.log('\nTest B: GET /books/1/ (Retrieve single book)...');
    const resB = await makeRequest('GET', '/books/1/');
    assert(resB.statusCode === 200, 'Status code is 200 OK', resB.statusCode);
    assert(resB.data && resB.data.id === 1, 'Returns book with id 1', resB.data);
    assert(resB.data.title === 'Node.js Design Patterns', 'Book title matches seed record', resB.data.title);


    console.log('\nTest C: GET /books/99999/ (Non-existent book 404)...');
    const resC = await makeRequest('GET', '/books/99999/');
    assert(resC.statusCode === 404, 'Status code is 404 Not Found', resC.statusCode);
    assert(resC.data && resC.data.error === 'Not Found', 'Returns 404 error message', resC.data);


    console.log('\nTest D: POST /books/ (Create disposable test book)...');
    const newBookPayload = {
      title: 'Testing Node.js',
      author: 'Demo Author',
      price: 399,
      pages: 250
    };
    const resD = await makeRequest('POST', '/books/', newBookPayload);
    assert(resD.statusCode === 201, 'Status code is 201 Created', resD.statusCode);
    assert(resD.data && resD.data.bookId > 0, 'Generated valid bookId', resD.data);
    const createdId = resD.data.bookId;
    console.log(`    -> Created book with ID: ${createdId}`);


    const resDVerify = await makeRequest('GET', `/books/${createdId}/`);
    assert(resDVerify.statusCode === 200, 'Newly created book can be retrieved via GET', resDVerify.statusCode);
    assert(resDVerify.data.title === 'Testing Node.js', 'Created title matches payload', resDVerify.data.title);


    console.log(`\nTest E: PUT /books/${createdId}/ (Full update on test book)...`);
    const updatePayload = {
      title: 'Testing Node.js (2nd Edition)',
      author: 'Demo Author & Co',
      price: 499,
      pages: 310
    };
    const resE = await makeRequest('PUT', `/books/${createdId}/`, updatePayload);
    assert(resE.statusCode === 200, 'Status code is 200 OK', resE.statusCode);
    assert(resE.data && resE.data.updatedBook.title === updatePayload.title, 'Updated title confirmed in response', resE.data);


    const resEVerify = await makeRequest('GET', `/books/${createdId}/`);
    assert(resEVerify.data.price === 499, 'Persisted price is updated', resEVerify.data.price);
    assert(resEVerify.data.pages === 310, 'Persisted pages is updated', resEVerify.data.pages);

    console.log(`\nTest F: DELETE /books/${createdId}/ (Delete test book)...`);
    const resF = await makeRequest('DELETE', `/books/${createdId}/`);
    assert(resF.statusCode === 200, 'Status code is 200 OK', resF.statusCode);

    console.log(`\nTest G: GET /books/${createdId}/ (Verify deletion returns 404)...`);
    const resG = await makeRequest('GET', `/books/${createdId}/`);
    assert(resG.statusCode === 404, 'Deleted book returns 404 Not Found', resG.statusCode);


    console.log('\nTest H: Invalid Input Validation (400 Bad Request)...');

    const resH1 = await makeRequest('POST', '/books/', { title: 'Missing Fields Book' });
    assert(resH1.statusCode === 400, 'Incomplete POST payload returns 400 Bad Request', resH1.statusCode);


    const resH2 = await makeRequest('POST', '/books/', {
      title: 'Invalid Book',
      author: 'Author',
      price: 'not-a-number',
      pages: 100
    });
    assert(resH2.statusCode === 400, 'Non-numeric price in POST returns 400 Bad Request', resH2.statusCode);


    const resH3 = await makeRequest('GET', '/books/abc/');
    assert(resH3.statusCode === 400, 'Non-integer bookId returns 400 Bad Request', resH3.statusCode);


    console.log('\nTest I: Verifying Original Seed Records Intact...');
    const resI = await makeRequest('GET', '/books/');
    assert(resI.data.length === 10, 'Total book count is exactly 10 (seed preserved)', resI.data.length);
    const ids = resI.data.map(b => b.id);
    const allOriginalIdsPresent = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].every(id => ids.includes(id));
    assert(allOriginalIdsPresent, 'All 10 original seed IDs (1-10) remain present', allOriginalIdsPresent);

    console.log('\n====================================================');
    console.log(`Summary: ${passed} passed, ${failed} failed out of ${passed + failed} tests.`);
    console.log('====================================================\n');

  } finally {
    server.close();
  }
}

if (require.main === module) {
  runTests().catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
