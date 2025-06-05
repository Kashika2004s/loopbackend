# Ingestion and Batch Processing API

This API allows you to submit a list of IDs for processing in batches with different priority levels. Each ingestion is split into batches of 3 IDs each, and the batches are processed asynchronously in the background with priority-based scheduling.

---

## Technologies Used

- Node.js
- Express.js
- MongoDB (Mongoose)
- UUID for unique IDs

---

## API Endpoints

### 1. POST `/ingest`

Submit a list of IDs to process with a specified priority.

- **Request Body:**

```json
{
  "ids": [1, 2, 3, 4, 5],
  "priority": "LOW"
}
