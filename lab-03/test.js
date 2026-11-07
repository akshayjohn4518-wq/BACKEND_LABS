// Automated Verification Test Suite for BDF Lab 3
// Tests REST API, Query Parameters, Validation, Error Handling & Seed Isolation
const http = require('http');
const { app, initializeDBAndServer } = require('./server');

const TEST_PORT = 3006;
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
  console.log('Running BDF Lab 3 Automated Test Suite');
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
    // ----------------------------------------------------
    // Section 1: Default GET /books/
    // ----------------------------------------------------
    console.log('--- Section 1: GET /books/ Default & Basic Lookups ---');
    const resAll = await makeRequest('GET', '/books/');
    assert(resAll.statusCode === 200, 'GET /books/ returns 200 OK', resAll.statusCode);
    assert(Array.isArray(resAll.data.books), 'Response contains "books" array', typeof resAll.data.books);
    assert(resAll.data.books.length === 10, 'Initial books count is exactly 10', resAll.data.books.length);

    // ----------------------------------------------------
    // Section 2: Search Query Parameter (search_q)
    // ----------------------------------------------------
    console.log('\n--- Section 2: Search Query Parameter (search_q) ---');
    const resSearchPython = await makeRequest('GET', '/books/?search_q=python');
    assert(resSearchPython.statusCode === 200, 'Search for "python" returns 200 OK', resSearchPython.statusCode);
    assert(resSearchPython.data.books.length === 1, 'Search finds 1 book with "Python"', resSearchPython.data.books.length);
    assert(resSearchPython.data.books[0].title === 'Python Crash Course', 'Matches "Python Crash Course"', resSearchPython.data.books[0].title);

    const resSearchNone = await makeRequest('GET', '/books/?search_q=nonexistent_xyz');
    assert(resSearchNone.statusCode === 200, 'Search for non-existent query returns 200 OK', resSearchNone.statusCode);
    assert(resSearchNone.data.books.length === 0, 'Non-existent search returns empty array', resSearchNone.data.books.length);

    // ----------------------------------------------------
    // Section 3: Sorting (order_by, order)
    // ----------------------------------------------------
    console.log('\n--- Section 3: Sorting Parameters (order_by, order) ---');
    const resSortPriceAsc = await makeRequest('GET', '/books/?order_by=price&order=ASC');
    assert(resSortPriceAsc.statusCode === 200, 'Sort by price ASC returns 200 OK', resSortPriceAsc.statusCode);
    const firstAscPrice = resSortPriceAsc.data.books[0].price;
    const lastAscPrice = resSortPriceAsc.data.books[resSortPriceAsc.data.books.length - 1].price;
    assert(firstAscPrice <= lastAscPrice, `Prices correctly ascending (${firstAscPrice} <= ${lastAscPrice})`, { firstAscPrice, lastAscPrice });

    const resSortPriceDesc = await makeRequest('GET', '/books/?order_by=price&order=DESC');
    assert(resSortPriceDesc.statusCode === 200, 'Sort by price DESC returns 200 OK', resSortPriceDesc.statusCode);
    const firstDescPrice = resSortPriceDesc.data.books[0].price;
    const lastDescPrice = resSortPriceDesc.data.books[resSortPriceDesc.data.books.length - 1].price;
    assert(firstDescPrice >= lastDescPrice, `Prices correctly descending (${firstDescPrice} >= ${lastDescPrice})`, { firstDescPrice, lastDescPrice });

    const resSortTitle = await makeRequest('GET', '/books/?order_by=title&order=ASC');
    assert(resSortTitle.statusCode === 200, 'Sort by title ASC returns 200 OK', resSortTitle.statusCode);
    assert(resSortTitle.data.books[0].title === 'Clean Code', 'Alphabetically first title is "Clean Code"', resSortTitle.data.books[0].title);

    // ----------------------------------------------------
    // Section 4: Pagination (limit, offset)
    // ----------------------------------------------------
    console.log('\n--- Section 4: Pagination Parameters (limit, offset) ---');
    const resPage1 = await makeRequest('GET', '/books/?limit=5&offset=0');
    assert(resPage1.statusCode === 200, 'Pagination page 1 returns 200 OK', resPage1.statusCode);
    assert(resPage1.data.books.length === 5, 'Limit 5 returns exactly 5 items', resPage1.data.books.length);

    const resPage2 = await makeRequest('GET', '/books/?limit=5&offset=5');
    assert(resPage2.statusCode === 200, 'Pagination page 2 returns 200 OK', resPage2.statusCode);
    assert(resPage2.data.books.length === 5, 'Limit 5 with offset 5 returns next 5 items', resPage2.data.books.length);
    assert(resPage1.data.books[0].id !== resPage2.data.books[0].id, 'Page 1 and Page 2 items do not overlap', { p1: resPage1.data.books[0].id, p2: resPage2.data.books[0].id });

    // ----------------------------------------------------
    // Section 5: Price Range Filtering (min_price, max_price)
    // ----------------------------------------------------
    console.log('\n--- Section 5: Price Range Filtering (min_price, max_price) ---');
    const resMinPrice = await makeRequest('GET', '/books/?min_price=600');
    assert(resMinPrice.statusCode === 200, 'Filter min_price=600 returns 200 OK', resMinPrice.statusCode);
    const allAbove600 = resMinPrice.data.books.every(b => b.price >= 600);
    assert(allAbove600, 'All books have price >= 600', allAbove600);

    const resMaxPrice = await makeRequest('GET', '/books/?max_price=500');
    assert(resMaxPrice.statusCode === 200, 'Filter max_price=500 returns 200 OK', resMaxPrice.statusCode);
    const allBelow500 = resMaxPrice.data.books.every(b => b.price <= 500);
    assert(allBelow500, 'All books have price <= 500', allBelow500);

    const resRange = await makeRequest('GET', '/books/?min_price=400&max_price=600');
    assert(resRange.statusCode === 200, 'Filter min_price=400 & max_price=600 returns 200 OK', resRange.statusCode);
    const allInRange = resRange.data.books.every(b => b.price >= 400 && b.price <= 600);
    assert(allInRange, 'All books fall in range [400, 600]', allInRange);

    // ----------------------------------------------------
    // Section 6: Combined Filters
    // ----------------------------------------------------
    console.log('\n--- Section 6: Combined Filters ---');
    const resCombined = await makeRequest('GET', '/books/?search_q=python&order_by=price&order=ASC&limit=5&offset=0&min_price=200&max_price=800');
    assert(resCombined.statusCode === 200, 'Combined filter query returns 200 OK', resCombined.statusCode);
    assert(resCombined.data.books.length === 1, 'Combined query matches 1 book', resCombined.data.books.length);
    assert(resCombined.data.books[0].title === 'Python Crash Course', 'Matches expected book', resCombined.data.books[0].title);

    // ----------------------------------------------------
    // Section 7: Query Parameter Validation (400 Bad Request)
    // ----------------------------------------------------
    console.log('\n--- Section 7: Query Parameter Validation Errors (400 Bad Request) ---');
    const resBadOrderCol = await makeRequest('GET', '/books/?order_by=malicious_col');
    assert(resBadOrderCol.statusCode === 400, 'Invalid order_by column returns 400 Bad Request', resBadOrderCol.statusCode);

    const resBadOrderDir = await makeRequest('GET', '/books/?order=SIDEWAYS');
    assert(resBadOrderDir.statusCode === 400, 'Invalid order direction returns 400 Bad Request', resBadOrderDir.statusCode);

    const resBadLimit = await makeRequest('GET', '/books/?limit=-5');
    assert(resBadLimit.statusCode === 400, 'Negative limit returns 400 Bad Request', resBadLimit.statusCode);

    const resBadOffset = await makeRequest('GET', '/books/?offset=-1');
    assert(resBadOffset.statusCode === 400, 'Negative offset returns 400 Bad Request', resBadOffset.statusCode);

    const resBadPriceRange = await makeRequest('GET', '/books/?min_price=900&max_price=200');
    assert(resBadPriceRange.statusCode === 400, 'min_price > max_price returns 400 Bad Request', resBadPriceRange.statusCode);
    assert(resBadPriceRange.data.message === 'min_price cannot be greater than max_price', 'Returns clear error message', resBadPriceRange.data.message);

    const resNonNumericPrice = await makeRequest('GET', '/books/?min_price=abc');
    assert(resNonNumericPrice.statusCode === 400, 'Non-numeric min_price returns 400 Bad Request', resNonNumericPrice.statusCode);

    // ----------------------------------------------------
    // Section 8: Single Book Retrieval (GET /books/:bookId/)
    // ----------------------------------------------------
    console.log('\n--- Section 8: Single Book Retrieval (GET /books/:bookId/) ---');
    const resGetSingle = await makeRequest('GET', '/books/1/');
    assert(resGetSingle.statusCode === 200, 'GET /books/1/ returns 200 OK', resGetSingle.statusCode);
    assert(resGetSingle.data.book && resGetSingle.data.book.id === 1, 'Book ID is 1', resGetSingle.data.book.id);

    const resGetNotFound = await makeRequest('GET', '/books/99999/');
    assert(resGetNotFound.statusCode === 404, 'GET /books/99999/ returns 404 Not Found', resGetNotFound.statusCode);
    assert(resGetNotFound.data.message === 'Book not found', 'Returns "Book not found" message', resGetNotFound.data.message);

    const resGetBadId = await makeRequest('GET', '/books/invalid-id/');
    assert(resGetBadId.statusCode === 400, 'GET /books/invalid-id/ returns 400 Bad Request', resGetBadId.statusCode);

    // ----------------------------------------------------
    // Section 9: POST /books/ Validation & Creation
    // ----------------------------------------------------
    console.log('\n--- Section 9: POST /books/ Creation & Validation ---');
    const resPostNoTitle = await makeRequest('POST', '/books/', { author: 'Demo', price: 300 });
    assert(resPostNoTitle.statusCode === 400, 'Missing title returns 400 Bad Request', resPostNoTitle.statusCode);
    assert(resPostNoTitle.data.message === 'Title is required', 'Error says "Title is required"', resPostNoTitle.data.message);

    const resPostEmptyTitle = await makeRequest('POST', '/books/', { title: '   ', author: 'Demo', price: 300 });
    assert(resPostEmptyTitle.statusCode === 400, 'Empty title returns 400 Bad Request', resPostEmptyTitle.statusCode);
    assert(resPostEmptyTitle.data.message === 'Title cannot be empty', 'Error says "Title cannot be empty"', resPostEmptyTitle.data.message);

    const resPostNoAuthor = await makeRequest('POST', '/books/', { title: 'Good Book', price: 300 });
    assert(resPostNoAuthor.statusCode === 400, 'Missing author returns 400 Bad Request', resPostNoAuthor.statusCode);
    assert(resPostNoAuthor.data.message === 'Author is required', 'Error says "Author is required"', resPostNoAuthor.data.message);

    const resPostNoPrice = await makeRequest('POST', '/books/', { title: 'Good Book', author: 'Demo' });
    assert(resPostNoPrice.statusCode === 400, 'Missing price returns 400 Bad Request', resPostNoPrice.statusCode);
    assert(resPostNoPrice.data.message === 'Price is required', 'Error says "Price is required"', resPostNoPrice.data.message);

    const resPostBadPrice = await makeRequest('POST', '/books/', { title: 'Good Book', author: 'Demo', price: 'cheap' });
    assert(resPostBadPrice.statusCode === 400, 'String price returns 400 Bad Request', resPostBadPrice.statusCode);

    // Valid POST (disposable record)
    const validBookPayload = {
      title: 'Node.js Fundamentals',
      author: 'John Smith',
      price: 450,
      pages: 320
    };
    const resPostSuccess = await makeRequest('POST', '/books/', validBookPayload);
    assert(resPostSuccess.statusCode === 201, 'Valid POST returns 201 Created', resPostSuccess.statusCode);
    assert(resPostSuccess.data.message === 'Book created successfully', 'Returns success message', resPostSuccess.data.message);
    const createdId = resPostSuccess.data.book.id;
    assert(createdId > 10, `Generated dynamic ID is ${createdId}`, createdId);

    // ----------------------------------------------------
    // Section 10: PUT /books/:bookId/ Update & Validation
    // ----------------------------------------------------
    console.log(`\n--- Section 10: PUT /books/${createdId}/ Update & Validation ---`);
    const updatePayload = {
      title: 'Node.js Fundamentals (Revised)',
      author: 'John Smith',
      price: 550,
      pages: 360
    };
    const resPutSuccess = await makeRequest('PUT', `/books/${createdId}/`, updatePayload);
    assert(resPutSuccess.statusCode === 200, 'Valid PUT returns 200 OK', resPutSuccess.statusCode);
    assert(resPutSuccess.data.message === 'Book updated successfully', 'Returns success message', resPutSuccess.data.message);
    assert(resPutSuccess.data.book.title === updatePayload.title, 'Updated title matches', resPutSuccess.data.book.title);

    const resPutNotFound = await makeRequest('PUT', '/books/99999/', updatePayload);
    assert(resPutNotFound.statusCode === 404, 'PUT /books/99999/ returns 404 Not Found', resPutNotFound.statusCode);

    const resPutBadBody = await makeRequest('PUT', `/books/${createdId}/`, { title: 'Only Title' });
    assert(resPutBadBody.statusCode === 400, 'PUT with missing fields returns 400 Bad Request', resPutBadBody.statusCode);

    // ----------------------------------------------------
    // Section 11: DELETE /books/:bookId/
    // ----------------------------------------------------
    console.log(`\n--- Section 11: DELETE /books/${createdId}/ Deletion ---`);
    const resDeleteSuccess = await makeRequest('DELETE', `/books/${createdId}/`);
    assert(resDeleteSuccess.statusCode === 200, 'Valid DELETE returns 200 OK', resDeleteSuccess.statusCode);
    assert(resDeleteSuccess.data.message === 'Book deleted successfully', 'Returns "Book deleted successfully"', resDeleteSuccess.data.message);

    const resDeleteNotFound = await makeRequest('DELETE', '/books/99999/');
    assert(resDeleteNotFound.statusCode === 404, 'DELETE /books/99999/ returns 404 Not Found', resDeleteNotFound.statusCode);

    const resGetAfterDelete = await makeRequest('GET', `/books/${createdId}/`);
    assert(resGetAfterDelete.statusCode === 404, 'GET deleted ID returns 404 Not Found', resGetAfterDelete.statusCode);

    // ----------------------------------------------------
    // Section 12: Seed Data Isolation
    // ----------------------------------------------------
    console.log('\n--- Section 12: Seed Data Isolation Verification ---');
    const resFinalAll = await makeRequest('GET', '/books/');
    assert(resFinalAll.data.books.length === 10, 'Total book count remains exactly 10', resFinalAll.data.books.length);
    const finalIds = resFinalAll.data.books.map(b => b.id);
    const allOriginalsPreserved = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].every(id => finalIds.includes(id));
    assert(allOriginalsPreserved, 'All 10 original seed records (IDs 1-10) remain intact', allOriginalsPreserved);

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

