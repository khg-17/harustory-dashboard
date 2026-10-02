#!/usr/bin/env python3
import sys
import argparse
from pathlib import Path

# 소스 경로 등록
sys.path.insert(0, str(Path(__file__).parent))

from src.generate_report import run_daily_intelligence_pipeline
from src.fetch_real_data import sync_daily_intelligence_data
from src.generate_monitoring_report import run_monitoring_pipeline

def main():
    parser = argparse.ArgumentParser(
        description="HaruStory Daily Monitoring Report Agent - 하루스토리 일간 모니터링 리포트 생성기"
    )
    
    parser.add_argument(
        "--data", 
        default="data/daily_timeseries.csv",
        help="입력 CSV 파일 경로 (기본값: data/daily_timeseries.csv)"
    )
    parser.add_argument(
        "--config", 
        default="config/metrics.yaml",
        help="지표 설정 YAML 파일 경로 (기본값: config/metrics.yaml)"
    )
    parser.add_argument(
        "--output-dir", 
        default="output",
        help="결과 저장 폴더 경로 (기본값: output)"
    )
    parser.add_argument(
        "--no-llm", 
        action="store_true",
        help="LLM API 호출을 스킵하고 파이썬 인텔리전스 엔진으로만 리포트를 생성합니다."
    )
    parser.add_argument(
        "--real-db", 
        action="store_true",
        default=True,
        help="대시보드 ClickHouse DB에서 최신 실제 시계열 데이터를 불러와 리포트를 생성합니다. (기본 True)"
    )
    parser.add_argument(
        "--app",
        default="tc",
        help="대시보드 실제 데이터 조회 대상 앱 코드 (기본값: tc [전체 통합 서비스])"
    )
    parser.add_argument(
        "--date",
        default=None,
        help="리포트 기준일 (YYYY-MM-DD 포맷, 지정하지 않으면 어제/전일 기준)"
    )
    parser.add_argument(
        "--notes", 
        default=None,
        help="전일 발생한 특이사항 (예: '서버 정기 점검, 신규 프로모션 오픈')"
    )

    args = parser.parse_args()

    print("=" * 65)
    print("📊 HaruStory Daily Monitoring Report Agent 실행 시작")
    print("=" * 65)

    try:
        # 1. 일간 모니터링 리포트 자동 생성
        monitoring_report_path = run_monitoring_pipeline(
            target_date=args.date,
            output_dir=args.output_dir
        )
        
        print("\n" + "=" * 65)
        print("✨ 하루스토리 일간 모니터링 리포트 생성이 성공적으로 완료되었습니다!")
        print(f"📝 일간 모니터링 리포트: {monitoring_report_path}")
        print("=" * 65)

    except Exception as e:
        print(f"\n❌ 실행 중 오류가 발생했습니다: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
