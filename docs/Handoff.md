# 일별 정산 데이터 제공 API v2 Handoff

> 응답 구조 변경: flat 일자 기준 → 일자별 앱 분해 구조  
> 배포 기준: 2026-08-27

## 응답 구조 변경

### 핵심 변경

| 항목 | v1 (flat) | v2 (nested) |
|------|-----------|------------|
| 응답 단위 | 일자별 합산 | 일자 → 앱별 분해 |
| 구조 | `{date, content, usedReward, ...}` | `{date, apps: [{appSN, appName, content, ...}]}` |
| 앱 구분 | 없음 | appSN + appName 필드 추가 |

### 응답 예시

#### Before

```json
{
  "data": [
    {
      "date": "2026-08-20",
      "content": { "payingCoin": { "freeCoin": 100, "paidCoin": 200 }, "chargeCoin": 300 },
      "usedReward": 50,
      "ad": { "adcash": 1000, "adforus": 0, "adsense": 0, "adpopcorn": 500, ... }
    }
  ]
}
```

#### After

```json
{
  "data": [
    {
      "date": "2026-08-20",
      "apps": [
        {
          "appSN": 1,
          "appName": "Webtoon_Demo",
          "content": { "payingCoin": { "freeCoin": 100, "paidCoin": 200 }, "chargeCoin": 300 },
          "usedReward": 50,
          "ad": { "adcash": 1000, "adforus": 0, "apWebCPC": 500, ... }
        }
      ]
    }
  ]
}
```

## 필드 변경

### 매체사 (ad 객체)

| 이전 | 현재 | 사유 |
|------|------|------|
| `adsense` | **(제거)** | 2026년 중단, 실적 0건 |
| `adpopcorn` | `apWebCPC` | 현 계약사 명칭 반영 |

**변경 후 매체사 목록** (6개):
- adcash, adforus, apWebCPC, buzzvil, rc, tossMini

### 신규 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `apps` | array | 일자별 앱 분해 배열 |
| `apps[].appSN` | number | 앱 ID |
| `apps[].appName` | string\|null | 앱명 (ChannelApp에 없으면 null) |

## 응답 값 특성

### 절사 불변식

앱별로 원 단위 절사가 일어나므로:
```
Σ(각 앱의 절사된 금액) ≤ 전체 금액
오차 범위: ±(앱수 - 1)원
```

### ad.rc (추정치)

RCPayload 참여건수 비율로 배분한 값:
```
ad.rc[app] = RCPerformance.revenueKrw 
           × (RCPayload[app].count / RCPayload[total].count)
```

- RCPayload.createAt 기준 (UTC): SP에서 -9시간 범위 시프트
- status=2 (완료)만 카운트
- 실제 협력사 정산액과 다를 수 있음

