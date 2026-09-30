# 🧠 HaruStory Daily Service Intelligence Report Agent

> **매일 아침 전일 완료 데이터를 바탕으로 요일 효과(Day-of-Week Effect)를 보정하여 서비스 상태와 원인을 다각도로 분석하는 AI 도구**

본 도구는 단순한 지표 나열이 아니라, **요일 효과(Day-of-Week Effect)**를 감안하여 **전주 동일 요일(WoW) 및 최근 4주 동일 요일 평균**을 주요 기준으로 서비스 상태 변동과 원인을 다각도로 인텔리전스하게 분석하는 리포트를 매일 자동 생성합니다.

---

## 💡 1. 7가지 핵심 비교 연산 명세

각 주요 KPI 지표에 대해 파이썬 연산 엔진이 아래 7가지 수치를 정밀하게 연산합니다:

1. **기준일 값 (Target Date Value)** (전일 완료 데이터)
2. **DoD (%)**: 전일 대비 (Day-over-Day)
3. **WoW (%)**: 전주 동일 요일 대비 (Week-over-Week, same day of week)
4. **vs_7d_avg (%)**: 최근 7일 평균 대비
5. **vs_4w_same_day_avg (%)**: 최근 4주 동일 요일 평균 대비
6. **recent_28d_trend**: 최근 28일 추세 (우상향/우하향/보합)
7. **consecutive_trend**: 최근 연속 상승/하락 일수

> ⚠️ **중요 (비즈니스 가이드라인)**:  
> 주말/평일 트래픽 차이 등 **요일 효과**가 존재하므로 단순 DoD만으로 이상 여부를 판단하지 않습니다. **WoW와 최근 4주 동일 요일 평균**을 이상 감지의 핵심 기준으로 사용합니다.

---

## 📁 2. 프로젝트 폴더 구조

```text
harustory-report-agent/
├── README.md                   # 💡 사용 설명서
├── requirements.txt            # 필요 패키지 목록
├── .env                        # API Key 설정 파일
├── config/
│   └── metrics.yaml            # 대시보드 탭별 지표 정의 및 경고 임계값
├── data/
│   ├── daily_timeseries.csv    # 35일간의 Daily 시계열 데이터
│   └── app_daily_anomalies.json# 앱별 튀는 지표 데이터
├── src/
│   ├── fetch_real_data.py      # ClickHouse DB 실시간 35일 시계열 수집기
│   ├── calculate_metrics.py    # 7가지 비교 기준 연산 엔진 (Python 전담)
│   ├── analyze_metrics.py      # 요일 효과 및 앱별 이상치 인텔리전스 분석기
│   ├── llm_reporter.py         # Daily Intelligence Report 마크다운 생성기
│   └── generate_report.py      # 파이프라인 오케스트레이터
├── output/                     # 📄 결과 저장 폴더
│   ├── daily_analysis.json     # 7가지 비교 수치 JSON
│   └── daily_intelligence_report.md # 최종 Daily Intelligence Report
└── main.py                     # 🚀 실행 메인 스크립트
```

---

## 💻 3. 터미널 실행 가이드 (Mac + VSCode)

VSCode 터미널(`Cmd + ~`)에서 아래 명령어를 실행하세요.

### STEP 1: 가상환경 이동 및 활성화
```bash
cd /Users/khg/Desktop/clickhouse-dashboard/harustory-report-agent
source venv/bin/activate
```

### STEP 2: Daily Intelligence Report 생성

#### 기본 실행 (어제 전일 완료 데이터 기준)
```bash
python main.py --real-db --no-llm
```

#### 특이사항 포함 실행 (이벤트, 점검 등)
```bash
python main.py --real-db --notes "전일 신규 프로모션 오픈, 서비스 장애 0건"
```

---

## 📄 4. 결과 파일 확인 방법

1. **`output/daily_intelligence_report.md`**: 완성된 Daily Intelligence Report
   - VSCode에서 해당 파일을 열고 **`Cmd + K, V`**를 누르면 예쁜 미리보기 패널로 열람하실 수 있습니다.
2. **`output/daily_analysis.json`**: 7가지 수치가 정밀 계산된 JSON 파일
