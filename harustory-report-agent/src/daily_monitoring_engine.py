import os
import json
import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from pathlib import Path

# Load environment
def load_env_local():
    env_local_path = Path(__file__).parent.parent.parent / ".env.local"
    if env_local_path.exists():
        with open(env_local_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ[k.strip()] = v.strip()

load_env_local()

CLICKHOUSE_HOST = os.getenv("CLICKHOUSE_HOST", "http://210.97.114.130:60001")
CLICKHOUSE_USER = os.getenv("CLICKHOUSE_USER", "mcp_user")
CLICKHOUSE_PASSWORD = os.getenv("CLICKHOUSE_PASSWORD", "4a475bd1ec3f439e")

SETTLEMENT_API_URL = os.getenv("SETTLEMENT_API_URL", "https://admin.treasurecomics.com/api/internal/v1/settlements/daily")
SETTLEMENT_API_CHANNEL_ID = os.getenv("SETTLEMENT_API_CHANNEL_ID", "guru")
SETTLEMENT_API_CHANNEL_SECRET = os.getenv("SETTLEMENT_API_CHANNEL_SECRET", "41697d0dad")

def query_clickhouse(sql: str) -> List[Dict[str, Any]]:
    params = {
        "user": CLICKHOUSE_USER,
        "password": CLICKHOUSE_PASSWORD,
        "query": sql + " FORMAT JSON"
    }
    try:
        resp = requests.get(CLICKHOUSE_HOST, params=params, timeout=30)
        if resp.status_code == 200:
            return resp.json().get("data", [])
        return []
    except Exception as e:
        print(f"⚠️ [ClickHouse Query Error] {e}")
        return []

def get_target_and_comparison_dates(target_date_str: Optional[str] = None):
    if not target_date_str:
        # DB completed date
        res = query_clickhouse("SELECT max(eventDateKst) as max_dt FROM Log.DailyActiveUsers")
        if res and res[0].get("max_dt"):
            max_dt = res[0]["max_dt"]
            today_str = datetime.now().strftime("%Y-%m-%d")
            target_date_str = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d") if max_dt == today_str else max_dt
        else:
            target_date_str = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

    target_dt = datetime.strptime(target_date_str, "%Y-%m-%d")
    comp_dates = {
        "target": target_date_str,
        "prev_7d": (target_dt - timedelta(days=7)).strftime("%Y-%m-%d"),
        "prev_14d": (target_dt - timedelta(days=14)).strftime("%Y-%m-%d"),
        "prev_21d": (target_dt - timedelta(days=21)).strftime("%Y-%m-%d"),
        "prev_28d": (target_dt - timedelta(days=28)).strftime("%Y-%m-%d"),
    }
    return comp_dates

def fetch_all_monitoring_data(comp_dates: Dict[str, str]):
    dates_list = [comp_dates["target"], comp_dates["prev_7d"], comp_dates["prev_14d"], comp_dates["prev_21d"], comp_dates["prev_28d"]]
    dates_in = ", ".join([f"'{d}'" for d in dates_list])
    
    print(f"🔍 [데이터 수집] 기준일 {comp_dates['target']} 및 4회 동일 요일 비교 데이터 조회 중...")
    
    # 1. Total & By App DAU
    dau_sql = f"""
    SELECT eventDateKst as dt, appID, uniqExactMerge(activeUserCount) as dau
    FROM Log.DailyActiveUsers
    WHERE eventDateKst IN ({dates_in})
    GROUP BY eventDateKst, appID
    """
    dau_rows = query_clickhouse(dau_sql)

    # Total DAU
    total_dau_sql = f"""
    SELECT eventDateKst as dt, uniqExactMerge(activeUserCount) as dau
    FROM Log.DailyActiveUsers
    WHERE eventDateKst IN ({dates_in})
    GROUP BY eventDateKst
    """
    total_dau_rows = query_clickhouse(total_dau_sql)

    # 2. New Users
    new_users_sql = f"""
    SELECT fs.firstEventDateKst AS dt, fs.appID as appID, count() AS new_users
    FROM Log.UserFirstSeen_V AS fs
    LEFT JOIN Log.AppNewUserWatermark_V AS w ON w.appID = fs.appID
    WHERE (toInt64OrZero(fs.accountSN) > ifNull(w.watermark, 0)) AND fs.firstEventDateKst IN ({dates_in})
    GROUP BY dt, appID
    """
    new_user_rows = query_clickhouse(new_users_sql)

    total_new_sql = f"""
    SELECT fs.firstEventDateKst AS dt, count() AS new_users
    FROM Log.UserFirstSeen_V AS fs
    LEFT JOIN Log.AppNewUserWatermark_V AS w ON w.appID = fs.appID
    WHERE (toInt64OrZero(fs.accountSN) > ifNull(w.watermark, 0)) AND fs.firstEventDateKst IN ({dates_in})
    GROUP BY dt
    """
    total_new_rows = query_clickhouse(total_new_sql)

    # 3. Total Events
    evt_sql = f"""
    SELECT eventDateKst as dt, appID, sum(eventCount) as events
    FROM Log.DailyEventCounts_V
    WHERE eventDateKst IN ({dates_in})
    GROUP BY eventDateKst, appID
    """
    evt_rows = query_clickhouse(evt_sql)

    total_evt_sql = f"""
    SELECT eventDateKst as dt, sum(eventCount) as events
    FROM Log.DailyEventCounts_V
    WHERE eventDateKst IN ({dates_in})
    GROUP BY eventDateKst
    """
    total_evt_rows = query_clickhouse(total_evt_sql)

    # 4. Page PV & UV (partition filtered)
    page_data = {}
    for d in [comp_dates["target"], comp_dates["prev_7d"]]:
        d_int = int(d.replace("-", ""))
        p_sql = f"""
        SELECT appID, label, count() as pv, uniqExact(accountSN) as uv
        FROM Log.UserActionLog
        WHERE env = 'prod' AND toYYYYMMDD(ts) = {d_int} AND event = 'impression'
          AND label IN ('all_tab_view', 'today_tab_view', 'library_tab_view', 'free_tab_view', 'reward_tab_view')
        GROUP BY appID, label
        """
        page_data[d] = query_clickhouse(p_sql)

    # 5. Missions
    m_sql = f"""
    SELECT mp.dt as dt, ac.appID as appID, count() as complete_cnt, uniqExact(mp.accountSN) as mission_uv, sum(mp.rewardAmount) as mission_p
    FROM Performance.MissionParticipation_Raw AS mp
    LEFT JOIN Performance.AppChannel_V AS ac ON ac.appSN = mp.appSN
    WHERE mp.dt IN ({dates_in}) AND mp.status = 'COMPLETED'
    GROUP BY dt, appID
    """
    mission_rows = query_clickhouse(m_sql)

    total_m_sql = f"""
    SELECT dt, count() as complete_cnt, uniqExact(accountSN) as mission_uv, sum(rewardAmount) as mission_p
    FROM Performance.MissionParticipation_Raw
    WHERE dt IN ({dates_in}) AND status = 'COMPLETED'
    GROUP BY dt
    """
    total_m_rows = query_clickhouse(total_m_sql)

    # 6. Attendance
    att_sql = f"""
    SELECT cr.dt as dt, ac.appID as appID,
           uniqExactIf(cr.accountSN, cr.consecutiveDay = 1) as day1_uv,
           uniqExactIf(cr.accountSN, cr.consecutiveDay = 7) as day7_uv
    FROM Performance.CheckInRecord_Raw AS cr
    LEFT JOIN Performance.AppChannel_V AS ac ON ac.appSN = cr.appSN
    WHERE cr.dt IN ({dates_in})
    GROUP BY dt, appID
    """
    att_rows = query_clickhouse(att_sql)

    total_att_sql = f"""
    SELECT dt,
           uniqExactIf(accountSN, consecutiveDay = 1) as day1_uv,
           uniqExactIf(accountSN, consecutiveDay = 7) as day7_uv
    FROM Performance.CheckInRecord_Raw
    WHERE dt IN ({dates_in})
    GROUP BY dt
    """
    total_att_rows = query_clickhouse(total_att_sql)

    # 7. Ad Revenue (sumMerge)
    ad_sql = f"""
    SELECT dt, appID, network, adCategory, round(sumMerge(revenue), 0) as ad_rev, sumMerge(impression) as imp
    FROM Performance.AdRevenueDaily
    WHERE dt IN ({dates_in})
    GROUP BY dt, appID, network, adCategory
    """
    ad_rows = query_clickhouse(ad_sql)

    total_ad_sql = f"""
    SELECT dt, round(sumMerge(revenue), 0) as ad_rev, sumMerge(impression) as imp
    FROM Performance.AdRevenueDaily
    WHERE dt IN ({dates_in})
    GROUP BY dt
    """
    total_ad_rows = query_clickhouse(total_ad_sql)

    # 8. Content Revenue (CashDaily)
    content_sql = f"""
    SELECT dt, appID, sumMerge(contentRevenueWon) as rev, uniqExactMerge(contentPayerUu) as payers
    FROM Performance.CashDaily
    WHERE dt IN ({dates_in})
    GROUP BY dt, appID
    """
    content_rows = query_clickhouse(content_sql)

    total_content_sql = f"""
    SELECT dt, sumMerge(contentRevenueWon) as rev, uniqExactMerge(contentPayerUu) as payers
    FROM Performance.CashDaily
    WHERE dt IN ({dates_in})
    GROUP BY dt
    """
    total_content_rows = query_clickhouse(total_content_sql)

    # 9. Exchanged Points (EarningDaily)
    earning_sql = f"""
    SELECT dt, appID, sumMerge(exchangedPoints) as exchanged, sumMerge(paidRewardAmount) as paid_reward
    FROM Performance.EarningDaily
    WHERE dt IN ({dates_in})
    GROUP BY dt, appID
    """
    earning_rows = query_clickhouse(earning_sql)

    total_earning_sql = f"""
    SELECT dt, sumMerge(exchangedPoints) as exchanged, sumMerge(paidRewardAmount) as paid_reward
    FROM Performance.EarningDaily
    WHERE dt IN ({dates_in})
    GROUP BY dt
    """
    total_earning_rows = query_clickhouse(total_earning_sql)

    return {
        "dates": comp_dates,
        "total_dau": total_dau_rows,
        "app_dau": dau_rows,
        "total_new": total_new_rows,
        "app_new": new_user_rows,
        "total_evt": total_evt_rows,
        "app_evt": evt_rows,
        "page_data": page_data,
        "total_m": total_m_rows,
        "app_m": mission_rows,
        "total_att": total_att_rows,
        "app_att": att_rows,
        "total_ad": total_ad_rows,
        "app_ad": ad_rows,
        "total_content": total_content_rows,
        "app_content": content_rows,
        "total_earning": total_earning_rows,
        "app_earning": earning_rows
    }
