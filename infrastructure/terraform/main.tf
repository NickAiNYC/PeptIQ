# AWS Infrastructure for PEPTIQ
provider "aws" {
  region = var.aws_region
}

# VPC
resource "aws_vpc" "peptiq_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "peptiq-vpc"
  }
}

# Public subnets
resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.peptiq_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name = "peptiq-public-a"
  }
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.peptiq_vpc.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = true

  tags = {
    Name = "peptiq-public-b"
  }
}

# Private subnets for RDS
resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.peptiq_vpc.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "${var.aws_region}a"

  tags = {
    Name = "peptiq-private-a"
  }
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.peptiq_vpc.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = "${var.aws_region}b"

  tags = {
    Name = "peptiq-private-b"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "peptiq_igw" {
  vpc_id = aws_vpc.peptiq_vpc.id

  tags = {
    Name = "peptiq-igw"
  }
}

# Route table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.peptiq_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.peptiq_igw.id
  }

  tags = {
    Name = "peptiq-public-rt"
  }
}

resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_b" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public.id
}

# DB Subnet Group
resource "aws_db_subnet_group" "peptiq_subnet_group" {
  name       = "peptiq-db-subnet-group"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]

  tags = {
    Name = "peptiq-db-subnet-group"
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "peptiq_db" {
  identifier     = "peptiq-db"
  engine         = "postgres"
  engine_version = "16.3"
  instance_class = "db.t4g.small"

  allocated_storage     = 20
  storage_encrypted     = true
  storage_type          = "gp3"

  db_name  = "peptiq"
  username = var.db_username
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.peptiq_subnet_group.name

  backup_retention_period = 14
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  enabled_cloudwatch_logs_exports = ["postgresql"]

  skip_final_snapshot = true

  tags = {
    Name        = "peptiq-database"
    Environment = var.environment
  }
}

# S3 for report storage
resource "aws_s3_bucket" "peptiq_reports" {
  bucket = "peptiq-reports-${var.environment}"

  tags = {
    Name        = "Peptide Quality Reports"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "reports_lifecycle" {
  bucket = aws_s3_bucket.peptiq_reports.id

  rule {
    id     = "archive_old_reports"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "reports_encryption" {
  bucket = aws_s3_bucket.peptiq_reports.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "reports_public_access" {
  bucket = aws_s3_bucket.peptiq_reports.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront CDN
resource "aws_cloudfront_distribution" "peptiq_cdn" {
  enabled = true

  origin {
    domain_name = aws_s3_bucket.peptiq_reports.bucket_regional_domain_name
    origin_id   = "S3-peptiq-reports"
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-peptiq-reports"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# ECS for API/Web
resource "aws_ecs_cluster" "peptiq_cluster" {
  name = "peptiq-cluster-${var.environment}"
}

# CloudWatch for monitoring
resource "aws_cloudwatch_dashboard" "peptiq_dashboard" {
  dashboard_name = "peptiq-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/RDS", "DatabaseConnections", { stat = "Sum" }],
            ["AWS/ECS", "CPUUtilization", { stat = "Average" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "System Metrics"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["Custom", "SampleSubmissionCount", { stat = "Sum" }],
            ["Custom", "ReportGenerationCount", { stat = "Sum" }]
          ]
          period = 3600
          stat   = "Sum"
          region = var.aws_region
          title  = "Business Metrics"
        }
      }
    ]
  })
}

# Security Groups
resource "aws_security_group" "ecs_sg" {
  name        = "peptiq-ecs-sg"
  description = "Allow HTTP/HTTPS"
  vpc_id      = aws_vpc.peptiq_vpc.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "rds_sg" {
  name        = "peptiq-rds-sg"
  description = "Allow PostgreSQL access from ECS"
  vpc_id      = aws_vpc.peptiq_vpc.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_sg.id]
  }
}
