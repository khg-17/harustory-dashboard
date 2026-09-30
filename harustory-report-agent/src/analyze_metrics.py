import json
from pathlib import Path
from typing import List, Dict, Any, Tuple

def analyze_daily_intelligence(
    metrics_list: List[Dict[str, Any]], 
    config: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Daily Service Intelligence Report용 정밀 다차원 분석 엔진.
    요일 효과(Day-of-Week Effect)를 고려하여 DoD 대신 WoW와 최근 4주 동일 요일 평균을 주요 기준으로 사용합니다.
    """
    metrics_map = {m["metric_id"]: m for m in metrics_list}
    thresholds = config.get("thresholds", {})
    warning_wow = thresholds.get("warning_wow_drop", -5.0)
    critical_wow = thresholds.get("critical_wow_drop", -10.0)

    # 1. 요일 효과 고려한 이상 상태 (Status) 판단
    for m in metrics_list:
        # DoD가 아닌 WoW와 4주 동일 요일 평균 대비 수치를 주요 기준으로 적용
        primary_change = m.get("wow", 0.0)
        same_day_change = m.get("vs_4w_same_day_avg", 0.0)

        if primary_change <= critical_wow or same_day_change <= critical_wow:
            m["status"] = "주의 경고 🚨"
        elif primary_change <= warning_wow or same_day_change <= warning_wow:
            m["status"] = "확인 필요 ⚠️"
        else:
            m["status"] = "정상 ✅"

    # 2. 탭 그룹별 연결 및 요일 분석
    group_analyses = []
    groups = config.get("groups", {})

    for g_key, g_info in groups.items():
        g_name = g_info.get("name", g_key)
        g_metric_ids = g_info.get("metrics", [])
        
        group_metrics = [metrics_map[mid] for mid in g_metric_ids if mid in metrics_map]
        if not group_metrics:
            continue

        primary_id = g_info.get("primary_metric")
        primary_metric = metrics_map.get(primary_id) if (primary_id and primary_id in metrics_map) else group_metrics[0]
        
        observation, interpretation_hint = generate_daily_observation(
            g_key, group_metrics, primary_metric
        )

        group_analyses.append({
            "group_key": g_key,
            "group_name": g_name,
            "primary_metric": primary_metric.get("metric_name", "주요 지표"),
            "primary_wow": primary_metric.get("wow", 0.0),
            "primary_same_day": primary_metric.get("vs_4w_same_day_avg", 0.0),
            "observation": observation,
            "interpretation_hint": interpretation_hint
        })

    # 3. 앱별 이상치(Anomaly) 데이터 로드
    app_anomalies = []
    app_json_path = Path(__file__).parent.parent / "data/app_daily_anomalies.json"
    if app_json_path.exists():
        try:
            with open(app_json_path, "r", encoding="utf-8") as f:
                app_list = json.load(f)
                for app_item in app_list:
                    if app_item.get("is_anomaly"):
                        direction = "전주 동일 요일 대비 급증 📈" if app_item["wow_same_day_pct"] > 0 else "전주 동일 요일 대비 급락 📉"
                        app_anomalies.append({
                            "app_name": app_item["app_name"],
                            "app_code": app_item["app_code"],
                            "cur_val": app_item["cur_val"],
                            "prev_same_day_val": app_item["prev_same_day_val"],
                            "wow_same_day_pct": app_item["wow_same_day_pct"],
                            "summary": f"{app_item['app_name']}({app_item['app_code']})의 수치가 {direction} (WoW 동일 요일 {app_item['wow_same_day_pct']:+0.1f}%)."
                        })
        except Exception as e:
            print(f"⚠️ [App Anomaly Load Warning] {e}")

    # 4. 확인 필요 사항 (우선순위 분류)
    action_items = []
    for m in metrics_list:
        if m["wow"] <= critical_wow or m["vs_4w_same_day_avg"] <= critical_wow:
            action_items.append({
                "priority": "High",
                "metric_name": m["metric_name"],
                "reason": f"전주 동일 요일 대비 {m['wow']:+0.1f}%, 4주 동일 요일 평균 대비 {m['vs_4w_same_day_avg']:+0.1f}% 하락 감지 (DoD는 {m['dod']:+0.1f}%)"
            })
        elif m["wow"] <= warning_wow or m["vs_4w_same_day_avg"] <= warning_wow:
            action_items.append({
                "priority": "Medium",
                "metric_name": m["metric_name"],
                "reason": f"전주 동일 요일 대비 {m['wow']:+0.1f}% 변동 및 추세({m['consecutive_trend']}) 지속"
            })

    for anomaly in app_anomalies:
        action_items.append({
            "priority": "High" if abs(anomaly["wow_same_day_pct"]) >= 25.0 else "Medium",
            "metric_name": f"앱별 수치 변동: {anomaly['app_name']}",
            "reason": f"전주 동일 요일 대비 {anomaly['wow_same_day_pct']:+0.1f}% 변동 ({anomaly['prev_same_day_val']:,} ➔ {anomaly['cur_val']:,})"
        })

    return {
        "metrics": metrics_list,
        "group_analyses": group_analyses,
        "app_anomalies": app_anomalies,
        "action_items": action_items
    }

def generate_daily_observation(
    group_key: str, 
    metrics: List[Dict[str, Any]], 
    primary: Dict[str, Any]
) -> Tuple[str, str]:
    m_map = {m["metric_id"]: m for m in metrics}

    if group_key == "users":
        dau = m_map.get("dau")
        new_u = m_map.get("new_users")
        ret_u = m_map.get("retained_users")
        if dau and new_u and ret_u:
            dau_wow = dau.get("wow", 0.0)
            dau_sd = dau.get("vs_4w_same_day_avg", 0.0)
            new_wow = new_u.get("wow", 0.0)
            ret_wow = ret_u.get("wow", 0.0)
            
            if dau_wow < 0 or dau_sd < 0:
                obs = f"전주 동일 요일 대비 DAU {dau_wow:+0.1f}% (4주 동일 요일 평균 대비 {dau_sd:+0.1f}%) 변동. 신규 사용자 WoW {new_wow:+0.1f}%, 기존 사용자 WoW {ret_wow:+0.1f}% 기록."
                hint = "요일 효과를 보정한 유입 및 리텐션 수치 다차원 검증 필요."
            else:
                obs = f"동일 요일 기준 DAU 상승세 견고 (WoW {dau_wow:+0.1f}%, 4주 동일 요일 대비 {dau_sd:+0.1f}%)."
                hint = "현재 유입 경로 및 요일별 트래픽 패턴 모니터링."
            return obs, hint

    elif group_key == "revenue":
        gross = m_map.get("gross_revenue")
        exc = m_map.get("exchanged_points")
        net = m_map.get("net_margin")
        if gross and exc and net:
            g_wow = gross.get("wow", 0.0)
            n_wow = net.get("wow", 0.0)
            obs = f"전주 동일 요일 대비 총 매출 WoW {g_wow:+0.1f}%, 순 영업 마진 WoW {n_wow:+0.1f}% 변동함."
            hint = "요일별 결제/환전 패턴 및 광고 단가 흐름 확인."
            return obs, hint

    primary_name = primary.get("metric_name", "주요 지표") if primary else "지표"
    primary_wow = primary.get("wow", 0.0) if primary else 0.0
    direction = "하락" if primary_wow < 0 else "상승"
    return f"{primary_name}가 전주 동일 요일 대비 {abs(primary_wow)}% {direction}함.", "동일 요일 기준 세부 원인 모니터링 필요."
