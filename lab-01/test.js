// Automated test script for BDF Lab 1 servers

const nativeServer = require('./native-server');
const expressApp = require('./server');

const TEST_PORT_NATIVE = 3001;
const TEST_PORT_EXPRESS = 3002;

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

async function runTests() {
  console.log('========================================');
  console.log('Running BDF Lab 1 Automated Verification');
  console.log('========================================\n');

  // 1. Test Native Server
  console.log('Testing Implementation A: Native Node.js HTTP Server...');
  await new Promise((resolve) => {
    const srv = nativeServer.listen(TEST_PORT_NATIVE, async () => {
      try {
        const res = await fetch(`http://localhost:${TEST_PORT_NATIVE}/`);
        assert(res.status === 200, `Status code is 200 (received: ${res.status})`);
        const text = await res.text();
        assert(text === 'Hello', `Response text is 'Hello' (received: '${text}')`);
      } catch (err) {
        assert(false, `Request failed: ${err.message}`);
      } finally {
        srv.close(resolve);
      }
    });
  });

  console.log('\nTesting Implementation B: Express Server...');
  await new Promise((resolve) => {
    const srv = expressApp.listen(TEST_PORT_EXPRESS, async () => {
      try {
        // Route 1: GET /
        console.log('\n- Testing GET /');
        const resHome = await fetch(`http://localhost:${TEST_PORT_EXPRESS}/`);
        assert(resHome.status === 200, `Status code is 200 (received: ${resHome.status})`);
        const textHome = await resHome.text();
        assert(
          textHome.toLowerCase().includes('welcome'),
          `Response contains welcome message (received: '${textHome}')`
        );

        // Route 2: GET /about
        console.log('\n- Testing GET /about');
        const resAbout = await fetch(`http://localhost:${TEST_PORT_EXPRESS}/about`);
        assert(resAbout.status === 200, `Status code is 200 (received: ${resAbout.status})`);
        const contentTypeAbout = resAbout.headers.get('content-type') || '';
        assert(
          contentTypeAbout.includes('application/json'),
          `Content-Type is JSON (received: '${contentTypeAbout}')`
        );
        const jsonAbout = await resAbout.json();
        assert('name' in jsonAbout, `JSON contains 'name' property (value: '${jsonAbout.name}')`);
        assert('section' in jsonAbout, `JSON contains 'section' property (value: '${jsonAbout.section}')`);

        // Route 3: GET /time
        console.log('\n- Testing GET /time');
        const resTime = await fetch(`http://localhost:${TEST_PORT_EXPRESS}/time`);
        assert(resTime.status === 200, `Status code is 200 (received: ${resTime.status})`);
        const contentTypeTime = resTime.headers.get('content-type') || '';
        assert(
          contentTypeTime.includes('application/json'),
          `Content-Type is JSON (received: '${contentTypeTime}')`
        );
        const jsonTime = await resTime.json();
        assert('currentTime' in jsonTime, `JSON contains 'currentTime' (value: '${jsonTime.currentTime}')`);
        const parsedDate = new Date(jsonTime.currentTime);
        assert(!isNaN(parsedDate.getTime()), `currentTime is a valid ISO date timestamp`);

        // Route 4: Unknown paths (404)
        console.log('\n- Testing GET /any-unknown-path (404 Catch-All)');
        const res404 = await fetch(`http://localhost:${TEST_PORT_EXPRESS}/any-unknown-path`);
        assert(res404.status === 404, `Status code is 404 (received: ${res404.status})`);
        const json404 = await res404.json();
        assert('error' in json404 || 'message' in json404, `Response contains readable error message`);

      } catch (err) {
        assert(false, `Express request failed: ${err.message}`);
      } finally {
        srv.close(resolve);
      }
    });
  });

  console.log('\n========================================');
  console.log(`Summary: ${passedTests}/${totalTests} tests passed.`);
  console.log('========================================\n');
}

runTests();

