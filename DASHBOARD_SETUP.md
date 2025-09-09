# Eduspace Pipeline Dashboard

## Overview
Real-time monitoring dashboard for Eduspace Pipeline executions with PDF preview capability.

## Features
- **Real-time Status Monitoring**: Live updates every 5 seconds for active pipeline executions
- **Execution Details**: Detailed view of each execution including:
  - Overall progress and status
  - Individual step progress
  - Input/output files
  - Error messages
  - Duration and timing information
- **PDF Preview**: View input PDF files directly in the dashboard
  - Zoom controls
  - Page navigation  
  - Fullscreen modal view
- **Status Filtering**: Filter executions by status (running, completed, failed, etc.)

## Technical Stack
- **Framework**: Next.js 15.5.2 with TypeScript
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Data Fetching**: TanStack React Query with 5-second polling
- **PDF Viewing**: react-pdf 9.1.1
- **HTTP Client**: Axios
- **Date Formatting**: date-fns

## API Integration
The dashboard connects to the main pipeline API through two endpoints:
- `/api/v1/composite-pipelines/executions/active` - Get active executions
- `/api/v1/composite-pipelines/executions/realtime-status` - Get real-time status updates

## Running the Dashboard

### Development
```bash
cd /home/jiwon/workspace/eduspace-pipeline-dashboard
pnpm dev
```
Access at: http://localhost:3002

### Production Build
```bash
pnpm build
pnpm start
```

### Docker
```bash
docker build -t eduspace-pipeline-dashboard .
docker run -p 3002:3002 -e NEXT_PUBLIC_API_BASE_URL=http://api:8000/api/v1 eduspace-pipeline-dashboard
```

## Environment Variables
- `NEXT_PUBLIC_API_BASE_URL`: API base URL (default: http://localhost:8000/api/v1)

## Key Components
- **ExecutionList**: Main table showing all executions
- **ExecutionDetail**: Detailed view of a single execution
- **PDFViewer**: PDF document viewer with controls
- **StepProgress**: Progress bar for individual pipeline steps
- **StatusBadge**: Color-coded status indicators

## Known Issues Resolved
- PDF.js version compatibility fixed by using react-pdf 9.1.1
- SSR issues resolved with dynamic imports
- Async file URL fetching implemented for MinIO presigned URLs