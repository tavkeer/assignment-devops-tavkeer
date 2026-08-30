# VPC Module: Multi-AZ Networking for DevOps Platform

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  az_count = length(var.availability_zones) > 0 ? length(var.availability_zones) : 2
  azs      = length(var.availability_zones) > 0 ? var.availability_zones : slice(data.aws_availability_zones.available.names, 0, 2)
}

# Main VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-${var.project_name}-vpc"
    }
  )
}

# Internet Gateway for Public Subnets
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-${var.project_name}-igw"
    }
  )
}

# Public Subnets (for ALB and NAT Gateway)
resource "aws_subnet" "public" {
  count                   = local.az_count
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 4, count.index)
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-${var.project_name}-public-subnet-${local.azs[count.index]}"
      Tier = "Public"
    }
  )
}

# Private Application Subnets (for ECS Fargate Tasks)
resource "aws_subnet" "private_app" {
  count             = local.az_count
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index + local.az_count)
  availability_zone = local.azs[count.index]

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-${var.project_name}-private-app-subnet-${local.azs[count.index]}"
      Tier = "Private-App"
    }
  )
}

# Private Database Subnets (for RDS PostgreSQL)
resource "aws_subnet" "private_db" {
  count             = local.az_count
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index + (local.az_count * 2))
  availability_zone = local.azs[count.index]

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-${var.project_name}-private-db-subnet-${local.azs[count.index]}"
      Tier = "Private-DB"
    }
  )
}

# Elastic IP for NAT Gateway
resource "aws_eip" "nat" {
  count  = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : local.az_count) : 0
  domain = "vpc"

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-${var.project_name}-nat-eip-${count.index + 1}"
    }
  )

  depends_on = [aws_internet_gateway.igw]
}

# NAT Gateway (placed in public subnet)
resource "aws_nat_gateway" "nat" {
  count         = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : local.az_count) : 0
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-${var.project_name}-nat-gw-${count.index + 1}"
    }
  )

  depends_on = [aws_internet_gateway.igw]
}

# Public Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-${var.project_name}-public-rt"
    }
  )
}

# Associate Public Subnets with Public Route Table
resource "aws_route_table_association" "public" {
  count          = local.az_count
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Private App Route Tables (route outbound traffic via NAT Gateway)
resource "aws_route_table" "private_app" {
  count  = local.az_count
  vpc_id = aws_vpc.main.id

  dynamic "route" {
    for_each = var.enable_nat_gateway ? [1] : []
    content {
      cidr_block     = "0.0.0.0/0"
      nat_gateway_id = var.single_nat_gateway ? aws_nat_gateway.nat[0].id : aws_nat_gateway.nat[count.index].id
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-${var.project_name}-private-app-rt-${local.azs[count.index]}"
    }
  )
}

# Associate Private App Subnets
resource "aws_route_table_association" "private_app" {
  count          = local.az_count
  subnet_id      = aws_subnet.private_app[count.index].id
  route_table_id = aws_route_table.private_app[count.index].id
}

# Private DB Route Table (Isolated, no internet access)
resource "aws_route_table" "private_db" {
  vpc_id = aws_vpc.main.id

  tags = merge(
    var.tags,
    {
      Name = "${var.environment}-${var.project_name}-private-db-rt"
    }
  )
}

# Associate Private DB Subnets
resource "aws_route_table_association" "private_db" {
  count          = local.az_count
  subnet_id      = aws_subnet.private_db[count.index].id
  route_table_id = aws_route_table.private_db.id
}

