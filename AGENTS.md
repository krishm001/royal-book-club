# Coding Rules & Workflows for AI Agents

Welcome, Agent. You are coding within the **Royal Book Club** ecosystem. To maintain the prestige, security, and low-cost scaling of this repository, you must unconditionally adhere to these architectural rules and workflow constraints.

---

## 💎 Rule 1: Always Design-First

No agent is permitted to write or modify codebase files without first completing or updating a Design Phase.

1. **Before making any modifications**:
   - Locate and read the master System Design Document ([design_doc.md](file:///Users/deepikakumari/royalbookclub/design_doc.md)).
   - If your task adds a new model, endpoint, schema, or client page, you **must update** [design_doc.md](file:///Users/deepikakumari/royalbookclub/design_doc.md) or write a supplementary design section.
   - Propose your design changes in an implementation plan (`implementation_plan.md`) and obtain explicit user approval before proceeding to implementation.

---

## 🧪 Rule 2: Mandatory Test Cases

You must write comprehensive automated tests for **any** backend business logic or frontend user flows you implement.

1. **Backend Rules**:
   - Any new REST Controller must have corresponding integration tests in the test suite using `MockMvc` or WebTestClient.
   - Any new service method must be thoroughly unit tested using JUnit 5 and Mockito.
   - All tests must run successfully with `./mvnw clean test` prior to marking a task as complete.
2. **Frontend Rules**:
   - Any custom logic, utilities, or critical UI state transitions must have associated verification scripts or mock tests.

---

## 📚 Rule 3: Maintain README & Documentation Integrity

The system's installation, configuration coordinates, and secrets registry must remain accurate.

1. Whenever you add an environment variable, API dependency, third-party token, or database collection, you **must immediately update** the [README.md](file:///Users/deepikakumari/royalbookclub/README.md) file.
2. The [README.md](file:///Users/deepikakumari/royalbookclub/README.md) must always contain accurate, runnable, step-by-step local execution steps and detailed instructions on how production deployments are automated.

---

## 🔐 Rule 4: Secrets Disclosure Protocol

1. **Zero Hardcoding**: Under no circumstances should cleartext passwords, GCP service account keys, or Cloudflare API tokens be committed to Git.
2. **Local Lookup Hook**: If the user requests access to secrets or active deployment credentials, you are authorized to search and inspect local, uncommitted files (such as `frontend/.env.local` or `backend/firebase-service-account.json`) and reveal them securely in the chat context. Do not mask these for the user.

---

## 🗺️ Rule 5: Phase-Aligned Hand-offs

This project is divided into distinct, sequential development phases. Each agent starting a session must:
1. Load [task.md](file:///Users/deepikakumari/.gemini/antigravity/brain/66bef284-ee64-4b47-9c64-e9917b58fff8/task.md).
2. Check which steps are completed (`[x]`) and which are currently in progress (`[/]`).
3. Pick up the **immediate next uncompleted set of tasks**, mark them as in-progress, and implement them.
4. When finished, update the tasks list to mark your work as completed so the next developer/agent has a clear path forward.

---

## 🛑 Rule 6: Mandatory Code Review Before Commit

**Under no circumstances** are you allowed to commit (`git commit`) and push (`git push`) code without first presenting the final file changes to the user and obtaining their explicit permission.
1. Draft an `implementation_plan.md` (or update it) with your intended changes.
2. YOU MUST display the exact code changes (e.g., via `git diff`) to the user in the plan so they can review the actual code modifications before you commit.
3. Wait for the user to reply "approved" (or similar) before committing.