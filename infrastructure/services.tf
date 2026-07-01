# List of required GCP APIs to enable
variable "gcp_services" {
  type        = list(string)
  description = "List of GCP APIs required for the project"
  default = [
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "firestore.googleapis.com",
    "language.googleapis.com",
    "vision.googleapis.com",
    "maps-backend.googleapis.com",
    "places-backend.googleapis.com",
    "geocoding-backend.googleapis.com"
  ]
}

# Enable APIs in the project
resource "google_project_service" "enabled_apis" {
  for_each           = toset(var.gcp_services)
  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}
