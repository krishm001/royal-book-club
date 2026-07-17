# Cloudflare provider configuration
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

variable "cloudflare_api_token" {
  type        = string
  description = "The Cloudflare API Token"
  sensitive   = true
}

variable "cloudflare_account_id" {
  type        = string
  description = "The Cloudflare Account ID"
}

variable "cloudflare_pages_project_name" {
  type        = string
  description = "The Cloudflare Pages project name"
  default     = "royal-book-club"
}

variable "cloudflare_zone_id" {
  type        = string
  description = "The Cloudflare Zone ID for royalbookclub.com (leave empty if DNS is managed elsewhere)"
  default     = ""
}

# Generate a cryptographically secure 32-character secret for origin validation
resource "random_password" "cloudflare_secret" {
  length  = 32
  special = false
}

# Provision the Cloudflare Pages project (configured for Direct Upload / GHA workflow)
resource "cloudflare_pages_project" "frontend" {
  account_id        = var.cloudflare_account_id
  name              = var.cloudflare_pages_project_name
  production_branch = "main"
}

# Associate apex custom domain (royalbookclub.com) with the Pages project
resource "cloudflare_pages_domain" "apex" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.frontend.name
  domain       = "royalbookclub.com"
}

# Associate www custom domain (www.royalbookclub.com) with the Pages project
resource "cloudflare_pages_domain" "www" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.frontend.name
  domain       = "www.royalbookclub.com"
}

# Optional: Configure DNS records for the custom domains if zone_id is provided
resource "cloudflare_record" "apex_cname" {
  count   = var.cloudflare_zone_id != "" ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = "@"
  content = "${var.cloudflare_pages_project_name}.pages.dev"
  type    = "CNAME"
  proxied = true
}

resource "cloudflare_record" "www_cname" {
  count   = var.cloudflare_zone_id != "" ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = "www"
  content = "${var.cloudflare_pages_project_name}.pages.dev"
  type    = "CNAME"
  proxied = true
}

# Output the generated secret and Pages info for secure configuration
output "cloudflare_pages_url" {
  value       = cloudflare_pages_project.frontend.subdomain
  description = "The default deployment subdomain of the Cloudflare Pages project"
}

output "cloudflare_secret_token" {
  value       = random_password.cloudflare_secret.result
  sensitive   = true
  description = "The secret token that Cloudflare must pass to the backend Cloud Run service"
}
