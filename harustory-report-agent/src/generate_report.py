import json
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
import pandas as pd

from src.load_data import load_config
from src.calculate_metrics import compute_daily_intelligence_stats
from src.analyze_metrics import analyze_daily_intelligence
from src.llm_reporter import generate_report_with_llm

def run_daily_intelligence_pipeline(
    csv_path: str,
    config_path: str,
    output_dir: str,
    no_llm: bool = False,
    notes: Optional[str] = None
) -> Tuple[str, str]:
    """
    Daily Service Intelligence Report 생성을 위한 전체 파이프라인 실행.
    """
    print(f"📂 [1/4] Daily 시계열 데이터 읽기 및 설정 로드 중... ({csv_path})")
    config = load_config(config_path)
    df_daily = pd.read_csv(csv_path)

    if df_daily.empty:
        raise ValueError("시계열 데이터가 비어 있습니다.")

    target_date = str(df_daily["eventDateKst"].iloc[-1])
    target_day_name = str(df_daily.get("day_name_kr", pd.Series([""])).iloc[-1])

    print(f"📊 [2/4] Daily Intelligence 7가지 비교 기준 연산 중 (기준일: {target_date} {target_day_name})...")
    calculated_metrics = compute_daily_intelligence_stats(df_daily)

    print("🔍 [3/4] 요일 효과(Day-of-Week) 및 앱별 이상치 분석 구조화 중...")
    analysis_data = analyze_daily_intelligence(calculated_metrics, config)

    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    json_file_path = out_path / "daily_analysis.json"
    with open(json_file_path, 'w', encoding='utf-8') as f:
        json.dump(analysis_data, f, ensure_ascii=False, indent=2)
    print(f"✅ [저장 완료] Daily 인텔리전스 JSON: {json_file_path}")

    print("📝 [4/4] Daily Service Intelligence Report 생성 중...")
    report_md = generate_report_with_llm(
        analysis_data=analysis_data,
        target_date=target_date,
        target_day_name=target_day_name,
        notes=notes,
        no_llm=no_llm
    )

    report_file_path = out_path / "daily_intelligence_report.md"
    with open(report_file_path, 'w', encoding='utf-8') as f:
        f.write(report_md)
    print(f"✅ [저장 완료] 최종 Daily 리포트: {report_file_path}")

    return str(json_file_path), str(report_file_path)
