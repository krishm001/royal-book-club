# Custom Service Account for least-privilege backend access
resource "google_service_account" "backend_sa" {
  account_id   = "royal-book-club-backend-sa"
  display_name = "Royal Book Club Backend Cloud Run Service Account"
}

# Grant Firestore (Datastore User) access to the service account
resource "google_project_iam_member" "firestore_access" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.backend_sa.email}"
}

# Grant Cloud Logging write permissions to the service account
resource "google_project_iam_member" "logging_access" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.backend_sa.email}"
}

# Cloud Run V2 service configuration
resource "google_cloud_run_v2_service" "backend_service" {
  name     = var.service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    # Scale-to-Zero and limit maximum scale to satisfy free-tier constraints
    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }

    service_account = google_service_account.backend_sa.email

    containers {
      image = "us-docker.pkg.dev/cloudrun/container/hello:latest"

      env {
        name  = "SPRING_PROFILES_ACTIVE"
        value = "prod"
      }
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image
    ]
  }

  depends_on = [
    google_artifact_registry_repository.docker_repo,
    google_project_iam_member.firestore_access,
    google_project_iam_member.logging_access
  ]
}

# Grant public unauthenticated access to the Cloud Run service
resource "google_cloud_run_v2_service_iam_member" "noauth" {
  project  = google_cloud_run_v2_service.backend_service.project
  location = google_cloud_run_v2_service.backend_service.location
  name     = google_cloud_run_v2_service.backend_service.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
