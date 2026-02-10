#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Build Quantum IA - a Web3 DAO governance mobile app for Solana that allows Quantum token holders to connect wallet, view portfolio, and vote on AI investment opportunities"

backend:
  - task: "Basic API endpoint"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "low"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Default FastAPI endpoint exists"
      - working: true
        agent: "testing"
        comment: "GET /api/ endpoint tested successfully - returns correct 'Hello World' message"
  
  - task: "Status check GET endpoint"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "GET /api/status endpoint tested successfully - returns list of status checks, proper JSON structure"
  
  - task: "Status check POST endpoint"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "POST /api/status endpoint tested successfully - creates status check with proper UUID, timestamp, and client name"
  
  - task: "MongoDB integration"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "MongoDB connectivity tested successfully - data persists correctly, can create and retrieve status checks"
  
  - task: "FastAPI backend server"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Backend server running on port 8001 via supervisor, accessible via external URL, CORS configured, proper API prefix /api"

  - task: "Pre-sale purchase endpoint"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "POST /api/presale/purchase endpoint, handles card (Stripe checkout) and crypto payments"
      - working: true
        agent: "testing"
        comment: "Comprehensive testing completed: crypto payment ($2500 for 1000 tokens), card payment (Stripe checkout created), validation (correctly rejects <100 tokens), webhook endpoint secure. All functionality working correctly."

  - task: "Pre-sale config endpoint"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "GET /api/config returns token price and other config. Verified working via frontend calls."
      - working: true
        agent: "testing"
        comment: "GET /api/config tested successfully: returns tokenPrice ($2.5), minPurchase (100), solanaAddress, commissionRate (10%). All fields present and correct data types."

  - task: "Referral data endpoint"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "GET /api/referral/{address} returns referral code and stats for the given wallet address"

frontend:
  - task: "Landing page responsive with visible CTA button"
    implemented: true
    working: true
    file: "app/index.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Rewrote landing page with pinned bottom button - always visible on all screen sizes. Logo with rounded corners. Using TouchableOpacity + useRouter for navigation."
  
  - task: "Phantom Wallet connection (real)"
    implemented: true
    working: true
    file: "contexts/WalletContext.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Real Phantom integration: web uses browser extension API (window.phantom.solana), mobile uses deep-link to Phantom app. Handles connect, disconnect, session restore. Shows alert if Phantom not installed."
  
  - task: "Portfolio screen with wallet connect"
    implemented: true
    working: true
    file: "app/(tabs)/portfolio.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Shows Connect Phantom button when disconnected, portfolio with token balances and logo when connected"
  
  - task: "AI Opportunities feed with filters"
    implemented: true
    working: true
    file: "app/(tabs)/opportunities.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Feed displays 5 AI companies with filters (All/Open/Closed/Funded), pull-to-refresh, voting progress bars, thumbnails"
  
  - task: "Pre-Sale form with validation"
    implemented: true
    working: true
    file: "app/(tabs)/presale.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Full form with inline validation errors (red borders + error text), payment method selection (card/crypto), logo integration, connects to backend API"

  - task: "Profile with functional settings"
    implemented: true
    working: true
    file: "app/(tabs)/profile.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Functional toggles for notifications/price alerts, network switcher (mainnet/devnet), clipboard copy, disconnect with confirmation dialog. Settings persisted via AsyncStorage."

  - task: "Referral/Affiliation page"
    implemented: true
    working: true
    file: "app/(tabs)/affiliation.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Referral dashboard with code display, copy/share buttons, stats grid, commission tracking"

  - task: "Delta-style tab bar design"
    implemented: true
    working: true
    file: "app/(tabs)/_layout.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Flat dark tab bar (#0F0F0F), purple active state, filled/outline icon toggle, subtle border"

  - task: "Consistent theme with all colors defined"
    implemented: true
    working: true
    file: "constants/theme.ts"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Added all missing colors (black, white, electricBlue, darkBlue, etc.), added SHADOWS object with subtle/medium/strong presets. Fixed SHADOWS.subtle crash."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 0
  run_ui: false

test_plan:
  current_focus:
    - "Pre-sale purchase endpoint"
    - "Pre-sale config endpoint"
    - "Referral data endpoint"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "Major rewrite complete: Fixed SHADOWS crash, fixed all missing colors in theme.ts, rewrote landing page for responsiveness (button always visible), implemented real Phantom wallet integration, added form validation to pre-sale, added functional settings to profile, redesigned tab bar to Delta style. Backend endpoints: GET /api/config, POST /api/presale/purchase, GET /api/referral/{address} need testing."