import os
import json
from typing import Dict, Any, Optional
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

SYSTEM_PROMPT = """너는 서비스 데이터 인텔리전스 분석 전문 AI Agent이다.
너의 역할은 매일 아침 전일의 완료된 대시보드 데이터를 바탕으로 'Daily Service Intelligence Report'를 생성하는 것이다.

중요 분석 지침:
1. 단순 지표 나열이 아니라 요일 효과(Day-of-Week Effect)를 고려하여 서비스 상태 변화와 원인을 다각도로 분석하라.
2. DoD(전일 대비)만으로 이상 여부를 단정하지 말고, WoW(전주 동일 요일 대비)와 4주 동일 요일 평균 대비 수치를 핵심 기준으로 평가하라.
3. 미션 지급 리워드는 원화(원)가 아닌 반드시 'P'(포인트) 단위로 서술하라. (예: 9,450,000 P)
4. 순 영업 마진(원) = 전체 총 매출 - 포인트 교환/환전액(원) 수식을 철저히 준수하라.
5. 수치를 자의적으로 재계산하거나 환각으로 지어내지 말라.
"""

def fmt_val(val, unit=""):
    if isinstance(val, (int, float)):
        if unit == "%":
            return f"{val:+.1f}%" if isinstance(val, float) else f"{val}%"
        elif unit == "P":
            return f"{int(val):,} P" if isinstance(val, float) and val.is_integer() else f"{val:,.0f} P"
        elif unit == "KRW":
            return f"{int(val):,}원" if isinstance(val, float) and val.is_integer() else f"{val:,.0f}원"
        else:
            if isinstance(val, float) and val.is_integer():
                return f"{int(val):,}"
            elif isinstance(val, float):
                return f"{val:,.1f}"
            return f"{val:,}"
    return str(val)

def generate_report_with_llm(
    analysis_data: Dict[str, Any], 
    target_date: str,
    target_day_name: str,
    notes: Optional[str] = None,
    no_llm: bool = False
) -> str:
    notes_text = notes if notes else "별도 확인된 특이사항 없음"
    api_key = os.getenv("OPENAI_API_KEY")
    
    if no_llm or not api_key:
        print("💡 [Info] 대시보드 정밀 파이썬 인텔리전스 엔진으로 Daily Report를 생성합니다.")
        return generate_fallback_report(analysis_data, target_date, target_day_name, notes_text)

    try:
        import openai
        client = openai.OpenAI(api_key=api_key)
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

        user_prompt = f"""아래는 {target_date} ({target_day_name}) 완료된 Daily Service Intelligence 데이터(JSON)입니다.

{json.dumps(analysis_data, ensure_ascii=False, indent=2)}

특이사항: {notes_text}

위 데이터를 바탕으로 'Daily Service Intelligence Report'를 마크다운 양식으로 완성해 주세요.
"""
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2
        )
        return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"⚠️ [Warning] LLM API 호출 대체 ({e})")
        return generate_fallback_report(analysis_data, target_date, target_day_name, notes_text)

def generate_fallback_report(
    analysis_data: Dict[str, Any], 
    target_date: str, 
    target_day_name: str, 
    notes_text: str
) -> str:
    metrics = analysis_data.get("metrics", [])
    group_analyses = analysis_data.get("group_analyses", [])
    app_anomalies = analysis_data.get("app_anomalies", [])
    action_items = analysis_data.get("action_items", [])

    dau = next((m for m in metrics if m["metric_id"] == "dau"), None)
    gross = next((m for m in metrics if m["metric_id"] == "gross_revenue"), None)
    net = next((m for m in metrics if m["metric_id"] == "net_margin"), None)

    # 1. Daily Executive Summary
    summary_parts = []
    if dau:
        summary_parts.append(f"기준일({target_date} {target_day_name}) 전체 DAU는 **{fmt_val(dau['current'])}명**으로, 전일 대비(DoD) {dau['dod']:+0.1f}%, 전주 동일 요일 대비(WoW) **{dau['wow']:+0.1f}%**를 기록하였습니다.")
    if gross and net:
        summary_parts.append(f"일 총 매출액은 **{fmt_val(gross['current'], 'KRW')}** (WoW {gross['wow']:+0.1f}%), 포인트 환전 차감 후 **순 영업 마진은 {fmt_val(net['current'], 'KRW')}** (WoW {net['wow']:+0.1f}%)를 나타냈습니다.")
    summary_text = " ".join(summary_parts)

    # 2. Daily KPI Intelligence Table (7가지 지표 다차원 비교)
    table_rows = []
    for m in metrics:
        cur_fmt = fmt_val(m['current'], m['unit'])
        dod_fmt = f"{m['dod']:+0.1f}%"
        wow_fmt = f"**{m['wow']:+0.1f}%**"
        v7d_fmt = f"{m['vs_7d_avg']:+0.1f}%"
        v4w_sd_fmt = f"**{m['vs_4w_same_day_avg']:+0.1f}%**"
        trend_28d = m.get("recent_28d_trend", "-")
        consecutive = m.get("consecutive_trend", "-")
        status = m.get("status", "정상 ✅")
        
        table_rows.append(f"| {m['metric_name']} | {cur_fmt} | {dod_fmt} | {wow_fmt} | {v7d_fmt} | {v4w_sd_fmt} | {trend_28d} | {consecutive} | {status} |")
    table_content = "\n".join(table_rows)

    # 3. 앱별 수치 변동 (동일 요일 비교)
    app_anomaly_md = ""
    if app_anomalies:
        app_rows = []
        for app in app_anomalies:
            direction = "급증 📈" if app["wow_same_day_pct"] > 0 else "급락 📉"
            app_rows.append(f"| {app['app_name']} ({app['app_code']}) | {app['prev_same_day_val']:,} 명 | {app['cur_val']:,} 명 | **{app['wow_same_day_pct']:+0.1f}%** ({direction}) | {app['summary']} |")
        app_rows_str = "\n".join(app_rows)
        app_anomaly_md = f"""
## 📱 3. 앱별 동일 요일 수치 변동 하이라이트

| 앱 명칭 | 전주 동일 요일 DAU | 기준일 DAU | WoW 동일 요일 변동 | 인텔리전스 관찰 서술 |
|---|---:|---:|---:|---|
{app_rows_str}
"""
    else:
        app_anomaly_md = """
## 📱 3. 앱별 동일 요일 수치 변동 하이라이트

- 주요 서비스 앱 간 전주 동일 요일 대비 이상 징후(±15% 변동) 없이 안정적 흐름 유지됨.
"""

    # 4. 탭별 연결 분석
    group_rows = []
    for g in group_analyses:
        group_rows.append(f"| {g['group_name']} | {g['primary_metric']} | 전주 동일 요일 WoW {g['primary_wow']:+0.1f}%, 4주 동일 요일 대비 {g['primary_same_day']:+0.1f}% | {g['observation']} | {g['interpretation_hint']} |")
    group_table = "\n".join(group_rows)

    # 5. 주요 지표 변화 상세
    sig_metrics = [m for m in metrics if abs(m["wow"]) >= 3.0 or abs(m["vs_4w_same_day_avg"]) >= 3.0]
    if not sig_metrics:
        sig_metrics = metrics[:2]

    changes_md = ""
    for idx, m in enumerate(sig_metrics[:3], 1):
        direction = "상승" if m["wow"] > 0 else "하락"
        changes_md += f"""
### 변화 {idx}: {m['metric_name']} {direction} (WoW {m['wow']:+0.1f}%, 4주 동일 요일 대비 {m['vs_4w_same_day_avg']:+0.1f}%)

- **[사실]**: 기준일 {m['metric_name']} 수치는 {fmt_val(m['current'], m['unit'])}로 전일 대비 {m['dod']:+0.1f}%, 전주 동일 요일({fmt_val(m['same_day_prev_week_val'], m['unit'])}) 대비 {m['wow']:+0.1f}% 변동함.
- **[해석]**: 최근 28일 추세는 '{m['recent_28d_trend']}', 연속 추세는 '{m['consecutive_trend']}' 양상임. 요일 효과를 감안할 때 동일 요일 수치 흐름이 주요함.
- **[추가 확인 필요]**: 해당 지표 유입 채널별 세그먼트 및 이벤트 반응률 세부 검증 필요.
"""

    # 6. 확인 필요 사항
    action_rows = []
    for act in action_items[:6]:
        action_rows.append(f"| {act['priority']} | {act['metric_name']} 검증 | {act['reason']} |")
    action_table = "\n".join(action_rows)

    # 7. 추천 실행 액션
    next_action_rows = []
    for act in action_items[:4]:
        next_action_rows.append(f"| {act['metric_name']} 원인 추적 및 유입 경로 세그먼트 추출 | {act['reason']} |")
    next_action_table = "\n".join(next_action_rows)

    date_str = pd_date_str()

    report_md = f"""# 🧠 Daily Service Intelligence Report

- **기준일**: {target_date} ({target_day_name}) 완료 데이터 기준
- **보고서 생성일**: {date_str}

---

## 📌 1. Daily Executive Summary (전일 핵심 브리핑)

{summary_text}

---

## 📊 2. Daily KPI Intelligence Table (7가지 지표 다차원 비교)

| 주요 KPI 지표 | 기준일 값 | DoD (전일 대비) | WoW (전주 동일요일 대비) | 최근 7일 평균 대비 | 최근 4주 동일요일 평균 대비 | 최근 28일 추세 | 연속 추세 | 종합 상태 |
|---|---:|---:|---:|---:|---:|---|---|---|
{table_content}

> 💡 **분석 가이드라인**: 요일 효과(Day-of-Week Effect)가 존재하므로 단순 DoD 보다는 **WoW (전주 동일 요일 대비)** 및 **최근 4주 동일 요일 평균 대비** 수치가 이상 감지의 주요 기준입니다. `순 영업 마진` = `전체 총 매출` - `포인트 교환/환전액(원)` 수식으로 연산되며, `미션 지급 리워드`는 포인트(P) 중간 재화 단위입니다.

---
{app_anomaly_md}

---

## 🔍 4. 주요 KPI 지표 변화 상세

{changes_md}

---

## 🔗 5. 대시보드 탭별 인텔리전스 관찰

| 탭 영역 | 주요 지표 | 동일 요일 변동성 | 관찰 결과 | 해석 및 제언 |
|---|---|---|---|---|
{group_table}

---

## 🚨 6. 특이사항 및 이슈

{notes_text}

---

## ⚠️ 7. 확인 필요 사항 (Prioritized Alerts)

| 우선순위 | 확인 항목 | 원인 추적 근거 |
|---|---|---|
{action_table}

---

## 🎯 8. 추천 실행 액션 (Action Plan)

| Action Plan | 세부 근거 |
|---|---|
{next_action_table}
"""
    return report_md

def pd_date_str() -> str:
    from datetime import datetime
    return datetime.now().strftime("%Y-%m-%d")
