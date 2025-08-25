package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"go_learning/models"
	"io"
	"mime/multipart"
	"os"
	"strings"

	"google.golang.org/genai"
)

const (
	Model string = "gemini-2.5-flash"
)

var (
	APIKey string
	AI     *genai.Client
)

type AnalyzeRequest struct {
	SystemPrompt string                `json:"system_prompt"`
	Data         *multipart.FileHeader `json:"data"`
	MimeType     string                `json:"mime_type"`
}

func InitGenAI() error {
	APIKey = os.Getenv("GENAI_KEY")
	ctx := context.Background()
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  APIKey,
		Backend: genai.BackendGeminiAPI,
	})

	if err != nil {
		return fmt.Errorf("error from InitGenAI:%v", err)
	}
	AI = client
	return nil
}

func NewAnalyzeRequest(SystemPrompt string, data *multipart.FileHeader, MimeType string) *AnalyzeRequest {
	return &AnalyzeRequest{SystemPrompt: SystemPrompt, Data: data, MimeType: MimeType}
}

func (Analyze *AnalyzeRequest) UseAnalyze() (*models.InvoiceSchema, error) {
	ctx := context.Background()

	stream, errFile := Analyze.Data.Open()
	if errFile != nil {
		return nil, errFile
	}
	defer stream.Close()

	fileBytes, err := io.ReadAll(stream)
	if err != nil {
		return nil, err
	}

	blob := genai.Blob{
		Data:     fileBytes,
		MIMEType: Analyze.MimeType,
	}

	content := &genai.Content{
		Parts: []*genai.Part{
			{Text: Analyze.SystemPrompt}, // system prompt
			{InlineData: &blob},          // file
		},
	}

	resp, err := AI.Models.GenerateContent(ctx, Model, []*genai.Content{content}, nil)
	if err != nil {
		return nil, fmt.Errorf("GenerateContent error: %v", err)
	}

	var jsonStr string
	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		jsonStr = resp.Candidates[0].Content.Parts[0].Text
	}

	cleanedRsp := CleanGeminiJSON(jsonStr)

	var invoice models.InvoiceSchema
	if err := json.Unmarshal([]byte(cleanedRsp), &invoice); err != nil {
		return nil, fmt.Errorf("unmarshal error: %v", err)
	}

	return &invoice, nil
}

func CleanGeminiJSON(response string) string {
	start := strings.Index(response, "{")
	end := strings.LastIndex(response, "}")
	if start != -1 && end != -1 && start < end {
		response = response[start : end+1]
	}
	return response
}
