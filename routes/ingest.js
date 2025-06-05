const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const Ingestion = require("../models/Ingestion");
const Batch = require("../models/Batch");
const PRIORITY_ORDER = { HIGH: 1, MEDIUM: 2, LOW: 3 };

let jobQueue = [];
let processing = false;

router.post("/ingest", async (req, res) => {
  try {
    const { ids, priority } = req.body;

    if (!ids || !priority || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Invalid input" });
    }

    if (!["HIGH", "MEDIUM", "LOW"].includes(priority)) {
      return res.status(400).json({ error: "Invalid priority" });
    }

    const ingestion_id = uuidv4();
    const createdAt = new Date();
    const ingestion = new Ingestion({ ingestion_id, priority, createdAt });
    await ingestion.save();

    const batches = [];
    for (let i = 0; i < ids.length; i += 3) {
      const batch_ids = ids.slice(i, i + 3);
      const batch_id = uuidv4();

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

      jobQueue.push({
        batch_id,
        ingestion_id,
        priority,
        createdAt,
        ids: batch_ids,
      });
    }

    ingestion.batches = batches.map((b) => b._id);
    await ingestion.save();

    if (!processing) {
      processQueue();
    }
    res.status(200).json({ ingestion_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/status/:ingestion_id", async (req, res) => {
  try {
    const ingestion = await Ingestion.findOne({
      ingestion_id: req.params.ingestion_id,
    }).populate("batches");

    if (!ingestion) {
      return res.status(404).json({ error: "Ingestion ID not found" });
    }

    const batchStatuses = ingestion.batches.map((b) => b.status);

    let status = "yet_to_start";
    if (batchStatuses.every((s) => s === "completed")) status = "completed";
    else if (batchStatuses.some((s) => s === "triggered")) status = "triggered";

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

function simulateFetch(id) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ id, data: "processed" });
    }, 1000);
  });
}
async function processQueue() {
  processing = true;
  while (jobQueue.length > 0) {
    try {
      jobQueue.sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority];
        const pb = PRIORITY_ORDER[b.priority];
        if (pa === pb) return a.createdAt.getTime() - b.createdAt.getTime();
        return pa - pb;
      });

      const batchJob = jobQueue.shift();

      await Batch.updateOne(
        { batch_id: batchJob.batch_id },
        { status: "triggered" }
      );

      await Promise.all(batchJob.ids.map((id) => simulateFetch(id)));

      await Batch.updateOne(
        { batch_id: batchJob.batch_id },
        { status: "completed" }
      );

      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error) {
      console.error("Error processing batch:", error);
    }
  }
  processing = false;
}

module.exports = router;
