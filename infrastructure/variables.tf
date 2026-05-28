variable "project_id" {
  type        = string
  description = "The GCP Project ID"
  default     = "royal-book-club"
}

variable "region" {
  type        = string
  description = "The target GCP region"
  default     = "us-central1"
}

variable "zone" {
  type        = string
  description = "The GCP availability zone"
  default     = "us-central1-a"
}

variable "repository_name" {
  type        = string
  description = "The Artifact Registry Docker repository name"
  default     = "royal-book-club-repo"
}

variable "service_name" {
  type        = string
  description = "The Cloud Run service name"
  default     = "royal-book-club-api"
}
