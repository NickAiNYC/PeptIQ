output "vpc_id" {
  value = aws_vpc.peptiq_vpc.id
}

output "rds_endpoint" {
  value = aws_db_instance.peptiq_db.endpoint
}

output "s3_bucket_name" {
  value = aws_s3_bucket.peptiq_reports.id
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.peptiq_cdn.domain_name
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.peptiq_cluster.name
}
