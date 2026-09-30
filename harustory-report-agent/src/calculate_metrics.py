import pandas as pd
import numpy as np
from typing import List, Dict, Any

def compute_daily_intelligence_stats(df_daily: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    하경님의 요구 사항에 따라 7가지 비교 기준 수치를 파이썬 엔진으로 결정 연산합니다.
    1. 기준일 값 (Target Date Value)
    2. DoD (%) : 전일 대비 (Day-over-Day)
    3. WoW (%) : 전주 동일 요일 대비 (Same Day of Week)
    4. vs_7d_avg (%) : 최근 7일 평균 대비
    5. vs_4w_same_day_avg (%) : 최근 4주 동일 요일 평균 대비
    6. recent_28d_trend : 최근 28일 추세
    7. consecutive_trend : 최근 연속 상승/하락 여부
    """
    df = df_daily.sort_values(by="eventDateKst").reset_index(drop=True)
    if len(df) < 29:
        raise ValueError("Daily Intelligence 연산을 위해 최소 29일 이상의 시계열 데이터가 필요합니다.")

    # 기준일 (가장 최근 날짜)
    target_idx = len(df) - 1
    target_row = df.iloc[target_idx]
    target_date = str(target_row["eventDateKst"])
    target_day_name = str(target_row.get("day_name_kr", ""))
    target_dow = target_row.get("day_of_week", 0)

    # 지표 대상 정의
    metric_configs = [
        {"id": "dau", "name": "DAU (일간 활성 유저)", "unit": "users", "col": "activeUserCount"},
        {"id": "new_users", "name": "신규 사용자", "unit": "users", "col": "newUserCount"},
        {"id": "retained_users", "name": "기존 사용자", "unit": "users", "col": "retainedUserCount"},
        {"id": "content_views", "name": "서비스 이벤트 이용량", "unit": "events", "col": "totalEventCount"},
        {"id": "gross_revenue", "name": "전체 총 매출", "unit": "KRW", "col": "gross_revenue"},
        {"id": "exchanged_points", "name": "포인트 교환/환전액", "unit": "KRW", "col": "exchanged_points"},
        {"id": "net_margin", "name": "순 영업 마진", "unit": "KRW", "col": "net_margin"},
        {"id": "mission_points", "name": "미션 지급 리워드", "unit": "P", "col": "mission_points"},
    ]

    results = []

    for m_cfg in metric_configs:
        m_id = m_cfg["id"]
        m_name = m_cfg["name"]
        unit = m_cfg["unit"]
        col = m_cfg["col"]

        if col not in df.columns:
            continue

        series = df[col].astype(float).values

        # 1. 기준일 값
        current_val = series[target_idx]

        # 2. DoD (전일 대비)
        prev_day_val = series[target_idx - 1]
        dod_pct = round(((current_val - prev_day_val) / prev_day_val * 100), 1) if prev_day_val > 0 else 0.0

        # 3. WoW (전주 동일 요일 대비, 7일 전)
        same_day_prev_week_val = series[target_idx - 7]
        wow_pct = round(((current_val - same_day_prev_week_val) / same_day_prev_week_val * 100), 1) if same_day_prev_week_val > 0 else 0.0

        # 4. vs_7d_avg (최근 7일 평균 대비)
        recent_7d_series = series[target_idx - 6 : target_idx + 1]
        avg_7d = np.mean(recent_7d_series)
        vs_7d_avg_pct = round(((current_val - avg_7d) / avg_7d * 100), 1) if avg_7d > 0 else 0.0

        # 5. vs_4w_same_day_avg (최근 4주 동일 요일 평균 대비)
        # target_idx, target_idx-7, target_idx-14, target_idx-21, target_idx-28 중 최근 4주(7,14,21,28일 전) 평균
        same_day_indices = [target_idx - 7, target_idx - 14, target_idx - 21, target_idx - 28]
        valid_indices = [i for i in same_day_indices if i >= 0]
        same_day_4w_vals = [series[i] for i in valid_indices]
        avg_4w_same_day = np.mean(same_day_4w_vals) if same_day_4w_vals else current_val
        vs_4w_same_day_avg_pct = round(((current_val - avg_4w_same_day) / avg_4w_same_day * 100), 1) if avg_4w_same_day > 0 else 0.0

        # 6. recent_28d_trend (최근 28일 추세)
        recent_28d_series = series[max(0, target_idx - 27) : target_idx + 1]
        trend_28d_str = analyze_28d_trend(recent_28d_series)

        # 7. consecutive_trend (최근 연속 상승/하락 여부)
        consecutive_str = analyze_consecutive_trend(series)

        def clean_num(v):
            if isinstance(v, float) and v.is_integer():
                return int(v)
            return round(v, 1) if isinstance(v, float) else v

        results.append({
            "metric_id": m_id,
            "metric_name": m_name,
            "unit": unit,
            "target_date": target_date,
            "target_day_name": target_day_name,
            "current": clean_num(current_val),
            "prev_day_val": clean_num(prev_day_val),
            "same_day_prev_week_val": clean_num(same_day_prev_week_val),
            "avg_7d": clean_num(avg_7d),
            "avg_4w_same_day": clean_num(avg_4w_same_day),
            "dod": dod_pct,
            "wow": wow_pct,
            "vs_7d_avg": vs_7d_avg_pct,
            "vs_4w_same_day_avg": vs_4w_same_day_avg_pct,
            "recent_28d_trend": trend_28d_str,
            "consecutive_trend": consecutive_str
        })

    return results

def analyze_28d_trend(series: np.ndarray) -> str:
    """최근 28일간의 전반적 추세(상승세, 우하향, 보합세 등)를 분석합니다."""
    if len(series) < 14:
        return "데이터 수집 중"

    # 전반 14일 평균 vs 후반 14일 평균 비교
    half = len(series) // 2
    first_half_avg = np.mean(series[:half])
    second_half_avg = np.mean(series[half:])

    diff_pct = ((second_half_avg - first_half_avg) / first_half_avg * 100) if first_half_avg > 0 else 0

    if diff_pct >= 5.0:
        return f"최근 28일 우상향 📈 (+{diff_pct:.1f}%)"
    elif diff_pct <= -5.0:
        return f"최근 28일 우하향 📉 ({diff_pct:.1f}%)"
    else:
        return "최근 28일 횡보 및 보합세 ➖"

def analyze_consecutive_trend(series: np.ndarray) -> str:
    """최근 일별 연속 상승/하락 일수를 반환합니다."""
    if len(series) < 2:
        return "보합"

    diffs = np.diff(series)
    last_diff = diffs[-1]

    if last_diff == 0:
        return "전일 대비 동일 (보합)"

    is_increase = last_diff > 0
    count = 0

    for d in reversed(diffs):
        if is_increase and d > 0:
            count += 1
        elif not is_increase and d < 0:
            count += 1
        else:
            break

    direction = "상승 🔺" if is_increase else "하락 🔻"
    if count >= 2:
        return f"{count}일 연속 {direction}"
    else:
        return f"전일 대비 {direction}"
