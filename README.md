# Data Ingestion API

This is a simple Data Ingestion API system that supports asynchronous batch processing with priorities and rate limiting.

---

## Features

- Ingest data by submitting a list of IDs and priority (HIGH, MEDIUM, LOW).
- Process batches of 3 IDs asynchronously.
- Rate limit: process max 1 batch per 5 seconds.
- Prioritize jobs by priority and request time.
- Check ingestion status with detailed batch info.
- Simulated external API calls with delay and static responses.

---

## Getting Started

### Prerequisites

- Node.js (v14 or later recommended)
- npm (comes with Node.js)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/Kashika2004s/loopbackend
cd your-repo
