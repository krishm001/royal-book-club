output "artifact_registry_url" {
  description = "The URL of the Artifact Registry Docker repository"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}"
}

output "cloud_run_service_url" {
  description = "The public URL of the deployed Cloud Run service"
  value       = google_cloud_run_v2_service.backend_service.uri
}

output "backend_service_account_email" {
  description = "The email of the Cloud Run service account"
  value       = google_service_account.backend_sa.email
}

output "firestore_database_name" {
  description = "The name of the provisioned Firestore database"
  value       = google_firestore_database.default.name
}

output "gcp_wif_provider" {
  description = "Copy this value into GitHub Actions Secret: GCP_WIF_PROVIDER"
  value       = google_iam_workload_identity_pool_provider.github_provider.name
}

output "gcp_wif_service_account" {
  description = "Copy this value into GitHub Actions Secret: GCP_WIF_SERVICE_ACCOUNT"
  value       = google_service_account.github_actions_sa.email
}

