#!/bin/bash
# MadMedCheck 셋업 및 실행 스크립트
# 로컬에서 실행: bash scripts/setup-and-run.sh

set -e

echo "=========================================="
echo "🏥 MadMedCheck 셋업 스크립트"
echo "=========================================="

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 환경 확인
echo -e "\n${YELLOW}[1/5] 환경 확인 중...${NC}"

if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env 파일이 없습니다.${NC}"
    echo "   .env.example을 복사하여 API 키를 입력해주세요:"
    echo "   cp .env.example .env"
    exit 1
fi

echo -e "${GREEN}✅ .env 파일 확인됨${NC}"

# 2. 의존성 설치
echo -e "\n${YELLOW}[2/5] 의존성 설치 중...${NC}"
npm install

# 3. Cloudflare 로그인 확인
echo -e "\n${YELLOW}[3/5] Cloudflare 인증 확인 중...${NC}"
if ! npx wrangler whoami > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️ Cloudflare 로그인이 필요합니다.${NC}"
    echo "   브라우저에서 로그인해주세요..."
    npx wrangler login
fi
echo -e "${GREEN}✅ Cloudflare 인증됨${NC}"

# 4. D1 데이터베이스 초기화
echo -e "\n${YELLOW}[4/5] D1 데이터베이스 초기화 중...${NC}"

# 데이터베이스 존재 확인
DB_EXISTS=$(npx wrangler d1 list 2>/dev/null | grep "madmedcheck-db" || true)

if [ -z "$DB_EXISTS" ]; then
    echo "   데이터베이스 생성 중..."
    npx wrangler d1 create madmedcheck-db
    echo -e "${YELLOW}   ⚠️ wrangler.toml에 database_id를 업데이트해주세요${NC}"
fi

# 스키마 적용
echo "   스키마 적용 중..."
npx wrangler d1 execute madmedcheck-db --file=./d1-schema.sql --remote

echo -e "${GREEN}✅ D1 데이터베이스 준비 완료${NC}"

# 5. 데이터 확인
echo -e "\n${YELLOW}[5/5] 샘플 데이터 확인 중...${NC}"
npx wrangler d1 execute madmedcheck-db --command "SELECT id, doctor_name, tier, total_score FROM doctors LIMIT 5" --remote

echo -e "\n${GREEN}=========================================="
echo "✅ 셋업 완료!"
echo "==========================================${NC}"
echo ""
echo "다음 명령어로 진행하세요:"
echo ""
echo "  📝 개발 서버 실행:"
echo "     npm run dev"
echo ""
echo "  🔍 데이터 크롤링 (강남 피부과):"
echo "     npm run pipeline -- --region 강남역 --specialty 피부과"
echo ""
echo "  🚀 배포:"
echo "     npm run deploy"
echo ""
