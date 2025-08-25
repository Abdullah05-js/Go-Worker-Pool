package main

import (
	"fmt"
	ai "go_learning/AI"
	"go_learning/cloudflare"
	"go_learning/models"
	"go_learning/prompts"
	"log"
	"mime/multipart"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
)

type Result struct {
	Invoice models.InvoiceSchema
	Err     error
}

type Job struct {
	ID         string
	Key        string
	file       *multipart.FileHeader
	ResultChan chan Result
}

const workerCount = 3
const chanBuffer = 50

var JobQueue chan Job

// Worker
func worker(id int, jobs <-chan Job) {
	for job := range jobs {
		response := new(Result)
		fmt.Printf("Worker %d processing job %s\n", id, job.ID)

		if job.file == nil {
			response.Err = fmt.Errorf("job file is nil")
			job.ResultChan <- *response
			continue
		}

		//gemini call
		analyzeRequest := ai.NewAnalyzeRequest(prompts.GetTurkishDocumentExtractionPrompt, job.file, job.file.Header.Get("Content-Type"))
		invoice, err := analyzeRequest.UseAnalyze()
		if err != nil {
			response.Err = err
			job.ResultChan <- *response
			continue
		}
		response.Invoice = *invoice

		fmt.Printf("Worker %d finished job %s\n", id, job.ID)

		if err := cloudflare.UplaodToCloudflare(job.Key, job.file, job.file.Header.Get("Content-Type")); err != nil {
			response.Err = err
			job.ResultChan <- *response
			continue
		}
		job.ResultChan <- *response
	}
}

func main() {

	if err := godotenv.Load(); err != nil {
		log.Fatalf("ERROR FROM server.go: %v:", err)
		return
	}

	if err := cloudflare.InitCloudflare(); err != nil {
		log.Fatalf("ERROR FROM server.go: %v:", err)
	}

	if err := ai.InitGenAI(); err != nil {
		log.Fatalf("ERROR FROM server.go: %v:", err)
	}

	//worker pool

	JobQueue = make(chan Job, chanBuffer)
	for i := 1; i <= workerCount; i++ {
		go worker(i, JobQueue)
	}

	app := fiber.New()

	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "http://localhost:3000", // Frontend
		AllowHeaders: "Origin, Content-Type, Accept",
	}))

	//Routes

	app.Post("/UploadInvoice", func(req *fiber.Ctx) error {
		file, err := req.FormFile("file")
		fmt.Printf("sending file:%s to worker \n", file.Filename)

		if err != nil {
			return req.Status(fiber.StatusBadRequest).SendString(err.Error())
		}

		key := fmt.Sprintf("invoices/%s-%s", uuid.New().String(), file.Filename)
		ResultChan := make(chan Result) //unbufferd chan
		job := Job{
			Key:        key,
			ID:         uuid.NewString(),
			file:       file,
			ResultChan: ResultChan,
		}

		JobQueue <- job

		Result := <-ResultChan //gelence kadar bekler (backpressure)

		if Result.Err != nil {
			return req.Status(fiber.StatusInternalServerError).SendString(Result.Err.Error())
		}

		return req.Status(fiber.StatusCreated).JSON(Result.Invoice)
	})

	if err := app.Listen(":5000"); err != nil {
		log.Fatal("Server failed:", err)
		return
	}
}
