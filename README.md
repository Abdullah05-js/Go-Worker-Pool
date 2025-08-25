# Go Worker Pool Demo 🚀

A demonstration project showcasing **worker pool patterns** in Go using real-world invoice processing. This project illustrates concurrent programming concepts, channel-based communication, and scalable worker architectures.

## Features

- 🏭 **Worker Pool Architecture**: Demonstrates producer-consumer pattern with configurable workers
- ⚡ **Concurrent Processing**: Multiple goroutines processing jobs simultaneously
- 📊 **Backpressure Handling**: Buffered channels prevent system overload
- 🔄 **Job Queue Management**: Efficient job distribution and result handling
- 🎯 **Real-world Application**: Invoice processing as a practical use case
- 📈 **Performance Testing**: Easy to benchmark and tune worker performance
- 🛡️ **Error Handling**: Proper error propagation in concurrent environment

## Worker Pool Concepts Demonstrated

### Core Components

```go
// Job represents a unit of work
type Job struct {
    ID         string                 // Unique job identifier
    Key        string                 // Storage key
    file       *multipart.FileHeader  // Work data
    ResultChan chan Result           // Result communication channel
}

// Result carries the outcome of job processing
type Result struct {
    Invoice models.InvoiceSchema  // Processed result
    Err     error                // Error information
}
```

### Worker Pool Configuration

```go
const workerCount = 3    // Number of concurrent workers
const chanBuffer = 50    // Job queue buffer size

var JobQueue chan Job    // Global job queue
```

## Architecture Pattern

```
HTTP Request → Job Creation → Job Queue → Worker Pool → AI + Storage → Response
     ↓              ↓             ↓           ↓            ↓            ↓
  [Client]    [Producer]    [Channel]   [Consumers]   [External]  [Client]
```

### Flow Explanation

1. **Producer**: HTTP handler creates jobs and sends to queue
2. **Queue**: Buffered channel holds pending jobs (backpressure control)  
3. **Workers**: Multiple goroutines consume jobs concurrently
4. **Processing**: Each worker handles AI processing and file upload
5. **Communication**: Results sent back via individual result channels

## Project Structure

```
worker-pool-demo/
├── main.go                 # Main server with worker pool
├── models/
│   └── invoice.go         # Invoice data structures
├── cloudflare/
│   └── cloudflare.go      # R2 storage client
├── ai/
│   └── ai.go              # Gemini AI client
├── prompts/
│   └── prompts.go         # AI prompts
├── frontend/              # React load testing UI
│   ├── components/
│   │   └── WorkerPoolTester.jsx
│   ├── package.json
│   └── next.config.js
├── .env                   # Environment variables
├── go.mod
└── README.md
```

### Environment Configuration

```env
# Required for demo to work (but focus is on worker pool)
GENAI_KEY=your-gemini-api-key
BUCKET_NAME=your-bucket
BUCKET_ACCESS_KEY=your-access-key  
BUCKET_SECRET_KEY=your-secret-key
ACCOUNT_ID=your-account-id
```

## Worker Pool Implementation

### Worker Function
```go
func worker(id int, jobs <-chan Job) {
    for job := range jobs {
        fmt.Printf("Worker %d processing job %s\n", id, job.ID)
        
        // Simulate work (AI processing + file upload)
        response := processJob(job)
        
        // Send result back via job's result channel
        job.ResultChan <- response
        
        fmt.Printf("Worker %d finished job %s\n", id, job.ID)
    }
}
```

### Job Distribution
```go
// Start worker pool
JobQueue = make(chan Job, chanBuffer)
for i := 1; i <= workerCount; i++ {
    go worker(i, JobQueue)
}

// Submit job (non-blocking with buffered channel)
JobQueue <- job

// Wait for result (blocking until worker completes)
result := <-job.ResultChan
```

## Frontend Load Tester 🎯

The project includes a **React-based load testing interface** that provides real-time visualization of worker pool performance.

### Features
- 📊 **Real-time Statistics**: Live updates of request progress and timing
- 🎛️ **Configurable Load**: Adjust concurrent request count (1-20)
- 📈 **Performance Metrics**: Response times, success rates, and throughput
- 🎨 **Visual Feedback**: Progress bars and status indicators
- 📁 **Drag & Drop**: Easy file upload interface

### Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to access the load tester interface.

## Testing Worker Pool Performance

### 1. Start Both Services
```bash
# Terminal 1 - Backend
go run main.go

# Terminal 2 - Frontend  
cd frontend && npm run dev
```

### 2. Using the Visual Load Tester

1. **Upload a test file** (PDF or image)
2. **Set concurrent requests** (try 1, 3, 5, 10, 20)
3. **Click "Load Test Başlat"**
4. **Watch real-time results**

### 3. What to Observe

**Backend Console:**
```
Worker 1 processing job abc-123
Worker 2 processing job def-456
Worker 3 processing job ghi-789
Worker 1 finished job abc-123
...
```

**Frontend Interface:**
- Request progress in real-time
- Individual response times
- Success/failure indicators
- Overall completion statistics

### 4. Performance Testing Scenarios

#### Scenario 1: Single Request
- **Request Count:** 1
- **Expected:** Immediate processing by any available worker
- **Observe:** Single worker handles the job

#### Scenario 2: Worker Saturation
- **Request Count:** 3 
- **Expected:** All workers busy simultaneously
- **Observe:** Optimal concurrency utilization

#### Scenario 3: Queue Backpressure  
- **Request Count:** 10+
- **Expected:** First 3 requests processed immediately, others queued
- **Observe:** Queue management in action

#### Scenario 4: System Overload
- **Request Count:** 20
- **Expected:** Demonstrates buffered channel behavior
- **Observe:** How system handles peak load

## Worker Pool Patterns Demonstrated

### 1. **Fan-Out Pattern**
- Single job queue feeds multiple workers
- Distributes load across available workers

### 2. **Result Aggregation**
- Each job has its own result channel
- Ensures responses match requests correctly

### 3. **Backpressure Control**
- Buffered channel prevents memory issues
- Blocks new jobs when queue is full

### 4. **Graceful Error Handling**
- Workers handle errors without crashing
- Failed jobs don't affect other processing

## Configuration Options

### Tuning Worker Count
```go
const workerCount = 3  // Start with CPU count
```

**Guidelines:**
- **CPU-bound tasks**: `runtime.NumCPU()`
- **I/O-bound tasks**: `2-4x CPU count`
- **Mixed workload**: Start with 3-5 workers

### Adjusting Buffer Size
```go
const chanBuffer = 50  // Queue capacity
```

**Considerations:**
- **Large buffer**: Higher memory usage, better throughput
- **Small buffer**: Lower memory, more backpressure
- **No buffer**: Synchronous processing

## Performance Testing

### Benchmarking Script
```go
func BenchmarkWorkerPool(b *testing.B) {
    // Setup worker pool
    setupWorkerPool()
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        // Submit job and measure processing time
        job := createTestJob()
        JobQueue <- job
        <-job.ResultChan
    }
}
```

### Metrics to Monitor
- **Throughput**: Jobs processed per second
- **Latency**: Time from job submission to completion
- **Queue depth**: Number of pending jobs
- **Worker utilization**: Active vs idle workers

## API Endpoints

### Process Invoice
```bash
POST /UploadInvoice
Content-Type: multipart/form-data

curl -X POST -F "file=@invoice.pdf" http://localhost:5000/UploadInvoice
```

**Response:**
```json
{
  "fatura_no": "FAT-2024-001",
  "fatura_tarihi": "2024-01-15",
  "satici_unvan": "ABC Şirketi",
  "genel_toplam": 1500.00,
  "kalemler": [
    {
      "aciklama": "Ürün A",
      "miktar": 2,
      "birim_fiyat": 500,
      "kdv_orani": 18,
      "tutar": 1000
    }
  ]
}
```


## Installation & Setup

```bash
# Clone the repository
git clone <repository-url>
cd worker-pool-demo

# Install Go dependencies
go mod tidy

# Install Node.js dependencies
cd frontend
npm install
cd ..
```

## Learning Objectives

After studying this project, you'll understand:

- ✅ **Worker Pool Pattern**: How to implement concurrent job processing
- ✅ **Channel Communication**: Producer-consumer with Go channels  
- ✅ **Backpressure**: Managing system load with buffered channels
- ✅ **Error Propagation**: Handling errors in concurrent systems
- ✅ **Resource Management**: Controlling goroutine lifecycle
- ✅ **Performance Tuning**: Optimizing worker count and buffer sizes
- ✅ **Load Testing**: Visual performance analysis with React frontend
- ✅ **Real-time UI**: WebSocket-like real-time updates without WebSockets
- ✅ **System Monitoring**: Tracking concurrent system behavior

## Common Worker Pool Challenges

### 1. **Deadlock Prevention**
```go
// ❌ Wrong: Can cause deadlock
ResultChan := make(chan Result) // unbuffered

// ✅ Correct: Always receive results
go func() {
    result := <-ResultChan
    // handle result
}()
```

### 2. **Graceful Shutdown**
```go
// Close job queue to stop workers
close(JobQueue)

// Wait for workers to finish
var wg sync.WaitGroup
// ... implement proper shutdown
```

### 3. **Memory Management**
```go
// Limit concurrent jobs to prevent memory issues
const maxConcurrentJobs = 100

if len(JobQueue) >= maxConcurrentJobs {
    return errors.New("system overloaded")
}
```

## Extending the Demo

### Add More Worker Types
```go
// Different worker types for different job types
go aiWorker(aiJobs)
go storageWorker(storageJobs)
go notificationWorker(notificationJobs)
```

### Implement Priority Queues
```go
type PriorityJob struct {
    Job
    Priority int
}

// Use heap for priority-based processing
```

### Add WebSocket Support
```javascript
// Real-time updates via WebSocket
const ws = new WebSocket('ws://localhost:5000/ws');
ws.onmessage = (event) => {
    const update = JSON.parse(event.data);
    updateWorkerStatus(update);
};
```

### Frontend Enhancements
- **Worker Status Visualization**: Show which workers are active
- **Queue Depth Monitoring**: Real-time queue size display  
- **Historical Performance**: Charts showing performance over time
- **Custom Test Scenarios**: Predefined load test configurations

## Further Reading

- [Go Concurrency Patterns](https://go.dev/blog/pipelines)
- [Effective Go - Concurrency](https://go.dev/doc/effective_go#concurrency)
- [Worker Pool Pattern](https://gobyexample.com/worker-pools)

## Contributing

This is a learning project! Feel free to:
- Add more worker pool patterns
- Implement different concurrency patterns
- Optimize performance
- Add monitoring and metrics

---

**Worker Pool Demo** - Learn concurrent programming patterns with Go! 🚀# Go-Worker-Pool
