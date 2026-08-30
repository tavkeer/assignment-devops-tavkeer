# Remote State Backend Configuration (S3 + DynamoDB State Locking)
# Configure bucket, key, and dynamodb_table for team state sharing when deploying to production:

# terraform {
#   backend "s3" {
#     bucket         = "devops-assignment-tfstate"
#     key            = "terraform.tfstate"
#     region         = "us-east-1"
#     dynamodb_table = "devops-assignment-tflocks"
#     encrypt        = true
#   }
# }
