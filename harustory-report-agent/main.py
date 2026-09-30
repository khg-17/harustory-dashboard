#!/usr/bin/env python3
import sys
import argparse
from pathlib import Path

# 소스 경로 등록
sys.path.insert(0, str(Path(__file__).parent))

from src.generate_report import run_daily_intelligence_pipeline
from src.fetch_real_data import sync_daily_intelligence_data

def main():
    parser = argparse.ArgumentParser(
        description="HaruStory Daily Service Intelligence Report Agent - 매일 아침 인텔리전스 분석 도구"
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
        help="대시보드 ClickHouse DB에서 최신 실제 시계열 데이터를 불러와 리포트를 생성합니다."
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
    print("🧠 HaruStory Daily Service Intelligence Report Agent 실행 시작")
    print("=" * 65)

    # 실제 DB 연동 또는 시계열 동기화
    if args.real_db or not Path(args.data).exists():
        print("🔗 [ClickHouse DB 연동] 최근 35일간의 실시간 대시보드 시계열 수치를 동기화합니다...")
        sync_daily_intelligence_data(target_date_str=args.date)

    try:
        json_path, report_path = run_daily_intelligence_pipeline(
            csv_path=args.data,
            config_path=args.config,
            output_dir=args.output_dir,
            no_llm=args.no_llm,
            notes=args.notes
        )
        
        print("\n" + "=" * 65)
        print("✨ Daily Intelligence Report 생성이 성공적으로 완료되었습니다!")
        print(f"📄 분석 JSON: {json_path}")
        print(f"📝 Daily 리포트: {report_path}")
        print("=" * 65)

    except Exception as e:
        print(f"\n❌ 실행 중 오류가 발생했습니다: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
