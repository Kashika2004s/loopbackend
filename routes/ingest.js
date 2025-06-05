const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const Ingestion = require("../models/Ingestion");
const Batch = require("../models/Batch");

// Priority order mapping to sort batches in the queue
const PRIORITY_ORDER = { HIGH: 1, MEDIUM: 2, LOW: 3 };

// In-memory job queue to store batches to be processed
let jobQueue = [];
// Flag to indicate if processing is currently running
let processing = false;

// POST /ingest endpoint - to submit IDs for ingestion and batch processing
router.post("/ingest", async (req, res) => {
  try {
    const { ids, priority } = req.body;

    // Validate input: ids must be a non-empty array, priority must be valid
    if (!ids || !priority || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Invalid input" });
    }

    if (!["HIGH", "MEDIUM", "LOW"].includes(priority)) {
      return res.status(400).json({ error: "Invalid priority" });
    }

    // Create a unique ingestion record with timestamp
    const ingestion_id = uuidv4();
    const createdAt = new Date();
    const ingestion = new Ingestion({ ingestion_id, priority, createdAt });
    await ingestion.save();

    const batches = [];
    // Split IDs into batches of size 3
    for (let i = 0; i < ids.length; i += 3) {
      const batch_ids = ids.slice(i, i + 3);
      const batch_id = uuidv4();

      // Create a batch document with status 'yet_to_start'
      const batch = new Batch({
        ingestion_id,
        batch_id,
        ids: batch_ids,
        status: "yet_to_start",
        priority,
        createdAt,
      });
      await batch.save();
      batches.push(batch);

      // Push the batch into the in-memory job queue for processing
      jobQueue.push({
        batch_id,
        ingestion_id,
        priority,
        createdAt,
        ids: batch_ids,
      });
    }

    // Link all batch IDs to the ingestion document
    ingestion.batches = batches.map((b) => b._id);
    await ingestion.save();

    // If processing is not running, start processing the job queue
    if (!processing) {
      processQueue();
    }

    // Respond with the ingestion ID for status checks
    res.status(200).json({ ingestion_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /status/:ingestion_id endpoint - check status of ingestion and batches
router.get("/status/:ingestion_id", async (req, res) => {
  try {
    // Find ingestion document and populate batches array
    const ingestion = await Ingestion.findOne({
      ingestion_id: req.params.ingestion_id,
    }).populate("batches");

    if (!ingestion) {
      return res.status(404).json({ error: "Ingestion ID not found" });
    }

    // Extract status of all batches
    const batchStatuses = ingestion.batches.map((b) => b.status);

    // Determine overall ingestion status based on batch statuses
    let status = "yet_to_start";
    if (batchStatuses.every((s) => s === "completed")) status = "completed";
    else if (batchStatuses.some((s) => s === "triggered")) status = "triggered";

    // Return ingestion info and batches with their status
    res.json({
      ingestion_id: ingestion.ingestion_id,
      status,
      batches: ingestion.batches.map((b) => ({
        batch_id: b.batch_id,
        ids: b.ids,
        status: b.status,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Simulate an async fetch operation per ID (e.g., external API call)
function simulateFetch(id) {
  return new Promise((resolve) => {
    setTimeout(() => {
      // After 1 second, resolve with dummy processed data
      resolve({ id, data: "processed" });
    }, 1000);
  });
}

// Function to process the job queue asynchronously and sequentially
async function processQueue() {
  processing = true;

  // Continue until all batches in the job queue are processed
  while (jobQueue.length > 0) {
    try {
      // Sort jobQueue by priority (HIGH > MEDIUM > LOW) and then by creation time (FIFO)
      jobQueue.sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority];
        const pb = PRIORITY_ORDER[b.priority];
        if (pa === pb) return a.createdAt.getTime() - b.createdAt.getTime();
        return pa - pb;
      });

      // Remove the highest priority batch job from the queue
      const batchJob = jobQueue.shift();

      // Update batch status to 'triggered' indicating processing started
      await Batch.updateOne(
        { batch_id: batchJob.batch_id },
        { status: "triggered" }
      );

      // Process all IDs in the batch concurrently (simulate external fetch)
      await Promise.all(batchJob.ids.map((id) => simulateFetch(id)));

      // Update batch status to 'completed' after processing finishes
      await Batch.updateOne(
        { batch_id: batchJob.batch_id },
        { status: "completed" }
      );

      // Wait 5 seconds before processing next batch to simulate delay
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error) {
      // Log error but continue processing next batches
      console.error("Error processing batch:", error);
    }
  }

  // Mark processing as finished once job queue is empty
  processing = false;
}

module.exports = router;
