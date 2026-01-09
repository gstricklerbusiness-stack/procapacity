# ProCapacity

**"Know who's free before you say yes."**

Capacity planning for 10–50 person marketing agencies. See who's at 40%, 80%, or 110% and decide who can take the next project or retainer.

## Features

- **Team Management**: Add team members with roles, skills, and weekly capacity
- **Projects & Retainers**: Track finite projects and ongoing retainers
- **Assignment Tracking**: Assign team members to projects with hours per week
- **Capacity Calendar**: Visual grid showing utilization by person and week
- **Over-allocation Warnings**: Get alerts when assignments exceed capacity
- **Who's Free Search**: Find available team members by role, skill, and hours needed
- **Utilization Reports**: Analyze team utilization with CSV export
- **Customizable Thresholds**: Configure warning and critical utilization levels

## Core Concepts

### Team Members
People in your agency with specific roles (Designer, Copywriter, etc.) and skills. Each team member has a default weekly capacity (typically 40 hours).

### Projects vs Retainers
- **Projects**: Time-bound work with a start and end date (e.g., "Brand Launch Campaign")
- **Retainers**: Ongoing client relationships with no fixed end date (e.g., "Monthly Social Media Management")

### Assignments
Link team members to projects with specific hours per week and date ranges. Assignments can be billable or non-billable.

### Utilization
The percentage of a team member's capacity that is assigned:
- **Green (0-80%)**: Available capacity
- **Yellow (80-95%)**: Near capacity
- **Red (>95%)**: Over-allocated

Thresholds are configurable in workspace settings.

### Internal Projects
Non-billable time tracking for:
- Internal / Admin
- Team Meetings
- PTO / Time Off
- Business Development

## Demo Data

New workspaces can load example data to explore the app:

1. Sign up and create a workspace
2. On the empty dashboard, click **"Load example data"**
3. This creates:
   - 10 team members with marketing agency roles
   - 6 client projects and retainers
   - 4 internal projects for time tracking
   - Realistic assignments with some capacity conflicts

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, shadcn/ui components
- **Backend**: Next.js API routes and Server Actions
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js (Auth.js) with credentials provider

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (local or cloud)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd procapacity
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your database URL:
```
DATABASE_URL="postgresql://user:password@localhost:5432/procapacity"
AUTH_SECRET="your-secret-key-here"
```

4. Run database migrations:
```bash
npx prisma migrate dev
```

5. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the app.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Secret key for NextAuth.js session encryption |
| `NEXT_PUBLIC_APP_URL` | Public URL of the app (e.g., `http://localhost:3000`) |
| `STRIPE_SECRET_KEY` | Stripe secret key for billing |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_STARTER_MONTHLY_PRICE_ID` | Stripe Price ID for Starter monthly |
| `STRIPE_STARTER_YEARLY_PRICE_ID` | Stripe Price ID for Starter yearly |
| `STRIPE_GROWTH_MONTHLY_PRICE_ID` | Stripe Price ID for Growth monthly |
| `STRIPE_GROWTH_YEARLY_PRICE_ID` | Stripe Price ID for Growth yearly |
| `STRIPE_SCALE_MONTHLY_PRICE_ID` | Stripe Price ID for Scale monthly |
| `STRIPE_SCALE_YEARLY_PRICE_ID` | Stripe Price ID for Scale yearly |

## Database Schema

- **Workspace**: Multi-tenant workspace/agency
- **User**: User accounts with owner/member roles
- **TeamMember**: Team members with roles and capacity
- **Project**: Projects and retainers with dates and status
- **Assignment**: Team member assignments to projects

## Project Structure

```
app/
├── (auth)/           # Auth pages (login, signup, invite)
├── (dashboard)/      # Protected dashboard routes
│   ├── team/         # Team management
│   ├── projects/     # Projects list and details
│   ├── capacity/     # Capacity calendar view
│   ├── reports/      # Utilization reports
│   └── settings/     # Workspace settings
├── api/              # API routes
└── actions/          # Server actions

components/           # React components
lib/                  # Utilities (auth, prisma, validation)
prisma/               # Database schema
```

## Pricing Tiers

All new signups start with a **14-day free trial** on the Growth plan.

### Starter ($149/mo or $1,490/yr)
- Up to 10 team members
- Up to 25 active projects/retainers
- 1 owner user
- Email support (2-business-day response)

### Growth ($299/mo or $2,990/yr) - Most Popular
- Up to 30 team members
- Up to 75 active projects/retainers
- 3 owner/admin users
- Everything in Starter, plus:
  - Role & department filters
  - Advanced report filters
  - Priority email support (next-business-day)
  - Early access to integrations
  - Optional 30-min onboarding call

### Scale ($499/mo or $4,990/yr)
- Up to 60 team members
- Up to 150 active projects/retainers
- 5 owner/admin users
- Everything in Growth, plus:
  - Priority support (same-day weekdays)
  - Dedicated onboarding setup
  - Extended data retention (12-18 months)
  - Custom integration requests

### What counts as a team member?
Team members are people you schedule work for: strategists, designers, developers, account managers, etc. Clients are not counted. You're only billed for active team members—archived members are free.

### Billing Setup (Development)

1. Create a Stripe account and get your API keys
2. Create products and prices in Stripe for each plan/period
3. Set up a webhook endpoint pointing to `/api/billing/webhook`
4. Configure your `.env` with the Stripe keys and price IDs
5. Enable the Stripe Customer Portal in your Stripe dashboard

## Roadmap

### Near-term
- [ ] Time tracking integration (Harvest, Toggl)
- [ ] Google Calendar integration for PTO/meetings
- [ ] Slack notifications for over-capacity warnings
- [ ] Email notifications for assignment changes
- [ ] Bulk assignment creation

### Medium-term
- [ ] Project templates
- [ ] Role-based capacity views
- [ ] Budget tracking per project
- [ ] Historical utilization trends
- [ ] API for integrations

### Long-term
- [ ] AI-powered staffing suggestions
- [ ] Forecast modeling
- [ ] Multi-workspace support
- [ ] Mobile app

## License

Private - All rights reserved
