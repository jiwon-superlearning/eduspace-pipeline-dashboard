# Eduspace Pipeline Dashboard

실시간 파이프라인 실행 현황을 모니터링하는 대시보드 웹 애플리케이션입니다.

## 기술 스택

- **Frontend Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Data Fetching**: React Query
- **Styling**: Tailwind CSS
- **Package Manager**: pnpm

## 주요 기능

### 📊 실행 목록 대시보드
- 현재 실행 중인 모든 파이프라인 실시간 표시
- 상태별 필터링 (All, Running, Pending, Completed, Failed)
- 진행률 시각화
- 5초 간격 자동 업데이트

### 📈 실행 상세 뷰
- 파이프라인 단계별 진행 상황
- 각 단계의 상태 및 진행률
- 오류 메시지 표시
- 예상 완료 시간 표시

### 🎨 UI 컴포넌트
- 상태 뱃지 (색상 코드)
- 진행률 바
- 실행 시간 표시
- 반응형 레이아웃

## 설치 및 실행

### 사전 요구사항
- Node.js 20 이상
- pnpm
- Eduspace Pipelines API 서버 실행 중

### 개발 환경 설정

1. 의존성 설치:
```bash
pnpm install
```

2. 환경 변수 설정:
`.env.local` 파일을 생성하고 다음 내용을 추가:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_REFRESH_INTERVAL=5000
```

3. 개발 서버 실행:
```bash
pnpm dev
```

브라우저에서 http://localhost:3000 접속

### 프로덕션 빌드

```bash
pnpm build
pnpm start
```

## Docker 실행

### Docker 이미지 빌드:
```bash
docker build -t eduspace-pipeline-dashboard .
```

### Docker 컨테이너 실행:
```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_BASE_URL=http://your-api-server:8000/api/v1 \
  eduspace-pipeline-dashboard
```

### Docker Compose 실행:
```bash
docker-compose up -d
```

## API 엔드포인트

대시보드는 다음 Eduspace Pipelines API 엔드포인트를 사용합니다:

- `GET /api/v1/composite-pipelines/executions/active` - 활성 실행 목록 조회
- `GET /api/v1/composite-pipelines/executions/realtime-status` - 실시간 상태 조회
- `GET /api/v1/composite-pipelines/{execution_id}/status` - 특정 실행 상태 조회

## 프로젝트 구조

```
src/
├── app/
│   ├── layout.tsx          # 루트 레이아웃
│   ├── page.tsx           # 메인 대시보드 페이지
│   └── providers.tsx      # React Query Provider
├── components/
│   ├── ui/               # shadcn/ui 컴포넌트
│   └── dashboard/        # 대시보드 컴포넌트
│       ├── ExecutionList.tsx
│       ├── ExecutionDetail.tsx
│       ├── StatusBadge.tsx
│       └── StepProgress.tsx
├── hooks/
│   ├── useExecutions.ts      # 실행 목록 훅
│   └── useRealTimeUpdates.ts # 실시간 업데이트 훅
└── lib/
    ├── api-client.ts     # API 클라이언트
    ├── types.ts         # TypeScript 타입 정의
    └── utils.ts         # 유틸리티 함수
```

## 개발 가이드

### 새로운 컴포넌트 추가
```bash
pnpm dlx shadcn@latest add [component-name]
```

### 타입 체크
```bash
pnpm tsc --noEmit
```

### 빌드 체크
```bash
pnpm build
```

## 라이선스

MIT