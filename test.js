// test.js
const axios = require("axios");

const BASE_URL = "https://loopbackend.onrender.com";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const testIngestion = async (ids, priority) => {
  const response = await axios.post(`${BASE_URL}/ingest`, {
    ids,
    priority,
  });
  return response.data.ingestion_id;
};

const testStatus = async (ingestion_id) => {
  const response = await axios.get(`${BASE_URL}/status/${ingestion_id}`);
  return response.data;
};

(async () => {
  try {
    console.log("🔹 Test 1: Ingest with MEDIUM priority");
    const ingestionId1 = await testIngestion([1, 2, 3, 4, 5], "MEDIUM");
    console.log("✅ Ingestion ID:", ingestionId1);

    await sleep(2000); // wait 2 sec before next priority

    console.log("🔹 Test 2: Ingest with HIGH priority");
    const ingestionId2 = await testIngestion([6, 7, 8, 9], "HIGH");
    console.log("✅ Ingestion ID:", ingestionId2);

    console.log("🕒 Waiting for processing...");
    await sleep(20000); // allow enough time for batches to process

    console.log("🔹 Test 3: Check status of MEDIUM priority job");
    const status1 = await testStatus(ingestionId1);
    console.log("✅ Status:", status1.status);
    console.log(JSON.stringify(status1, null, 2));

    console.log("🔹 Test 4: Check status of HIGH priority job");
    const status2 = await testStatus(ingestionId2);
    console.log("✅ Status:", status2.status);
    console.log(JSON.stringify(status2, null, 2));

    if (
      status2.status === "completed" &&
      status2.batches.length > 0 &&
      status1.status === "completed"
    ) {
      console.log("🎉 All 5 Tests Passed!");
    } else {
      console.log("❌ Some tests failed. Check statuses.");
    }
  } catch (err) {
    console.error("❌ Test failed:", err.message);
  }
})();
