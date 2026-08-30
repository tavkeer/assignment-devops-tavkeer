# Remote State Backend Configuration (S3 + DynamoDB State Locking)
# To enable remote state:
# 1. Create S3 Bucket: `aws s3 mb s3://<your-tf-state-bucket-name> --region <region>`
# 2. Enable Bucket Versioning: `aws s3api put-bucket-versioning --bucket <your-tf-state-bucket-name> --versioning-configuration Status=Enabled`
# 3. Create DynamoDB Lock Table: `aws dynamodb create-table --table-name tf-locks --attribute-definitions AttributeName=LockID,AttributeType=S --key-schema AttributeName=LockID,KeyType=HASH --billing-mode PAY_PER_REQUEST`
# 4. Uncomment the backend block below and update bucket & region:

# terraform {
#   backend "s3" {
#     bucket         = "devops-assignment-tfstate-bucket"
#     key            = "environments/state.tfstate"
#     region         = "us-east-1"
#     dynamodb_table = "devops-assignment-tflocks"
#     encrypt        = true
#   }
# }

