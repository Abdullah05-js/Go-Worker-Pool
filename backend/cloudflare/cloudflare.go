package cloudflare

import (
	"context"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

var (
	bUCKET_NAME       string
	bUCKET_ACCESS_KEY string
	bUCKET_SECRET_KEY string
	ACCOUNT_ID        string
	cloudFlare        *s3.Client
	presignClient     *s3.PresignClient
)

func InitCloudflare() error {
	bUCKET_NAME = os.Getenv("BUCKET_NAME")
	bUCKET_ACCESS_KEY = os.Getenv("BUCKET_ACCESS_KEY")
	bUCKET_SECRET_KEY = os.Getenv("BUCKET_SECRET_KEY")
	ACCOUNT_ID = os.Getenv("ACCOUNT_ID")

	// Validate environment variables
	if bUCKET_NAME == "" || bUCKET_ACCESS_KEY == "" || bUCKET_SECRET_KEY == "" || ACCOUNT_ID == "" {
		return fmt.Errorf("missing required environment variables")
	}

	// Create credentials
	creds := credentials.NewStaticCredentialsProvider(bUCKET_ACCESS_KEY, bUCKET_SECRET_KEY, "")

	// Create configuration
	cfg := aws.Config{
		Region:      "auto",
		Credentials: creds,
	}

	// Create S3 client with manual endpoint
	cloudFlare = s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(fmt.Sprintf("https://%s.r2.cloudflarestorage.com", ACCOUNT_ID))
		o.UsePathStyle = true // Important for R2
	})

	presignClient = s3.NewPresignClient(cloudFlare)

	fmt.Println("Created Cloudflare R2 object successfully")
	return nil
}

func UplaodToCloudflare(key string, data *multipart.FileHeader, contentType string) error {

	stream, errFile := data.Open()
	if errFile != nil {
		return errFile
	}
	defer stream.Close()

	params := &s3.PutObjectInput{
		Key:         &key,
		Bucket:      &bUCKET_NAME,
		Body:        stream.(io.Reader),
		ContentType: &contentType,
	}

	_, err := cloudFlare.PutObject(context.TODO(), params)
	if err != nil {
		return err
	}
	log.Println("Upload successful: ", key)
	return nil
}

func GeneratePresignedGetURL(key string, expires time.Duration) (string, error) {

	params := &s3.GetObjectInput{
		Bucket: &bUCKET_NAME,
		Key:    &key,
	}

	presignedReq, err := presignClient.PresignGetObject(context.TODO(), params, func(opts *s3.PresignOptions) {
		if expires > 0 {
			opts.Expires = expires
		} else {
			opts.Expires = time.Minute * 30
		}
	})

	if err != nil {
		return "", err
	}

	return presignedReq.URL, nil
}
