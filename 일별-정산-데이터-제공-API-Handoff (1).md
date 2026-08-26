# 일별 정산 데이터 제공 API Handoff

> 일별 정산 데이터 조회 API를 사용하는 내부 담당자에게 전달하는 호출 명세
> 담당자 조성진

## API 정보

| 항목        | 내용                                                                                                |
| ----------- | --------------------------------------------------------------------------------------------------- |
| Endpoint    | `https://admin.treasurecomics.com/api/internal/v1/settlements/daily`                                |
| HTTP Method | `GET`                                                                                               |
| Description | 구루 전체 앱의 일별 콘텐츠·리워드·광고 매출 데이터를 임의 날짜 범위로 제공하는 내부 read API입니다. |

## Authorization

```text
Authorization: Basic <base64(channelID:channelSecret)>
```

`channelID`는 `guru` 고정이다. 그 외 채널로 호출하면 `403`을 반환한다. `channelID`·`channelSecret`은 별도로 전달한다. 문서에는 실제 인증 정보를 기록하지 않는다.

## Request

### Header

| Name            | Value              | Description      |
| --------------- | ------------------ | ---------------- |
| `Content-Type`  | `application/json` | 요청 콘텐츠 타입 |
| `Authorization` | `Basic {{token}}`  | Basic 인증 토큰  |

### Parameters

| Name        | Type     | Format     | Required | Nullable | Description            |
| ----------- | -------- | ---------- | -------- | -------- | ---------------------- |
| `startDate` | `string` | `yyyyMMdd` | Y        | N        | 조회 시작일(포함, KST) |
| `endDate`   | `string` | `yyyyMMdd` | Y        | N        | 조회 종료일(포함, KST) |

- 두 파라미터를 모두 보내야 한다. 형식을 벗어나면 `400 Bad Request`를 반환한다.
- 특정 채널·앱 단위 조회는 지원하지 않는다. 응답은 항상 전체 앱을 합산한 값이다.
- `startDate`가 `endDate`보다 늦으면 `400 Bad Request`다.
- `startDate`는 `2026-01-01` 이전일 수 없다. `content` 넷매출 산출에 필요한 유료코인 결제수수료 원화 데이터가 그 이전에는 적재돼 있지 않다.
- `endDate`는 KST 기준 어제(D-1)보다 늦을 수 없다 — 오늘 이후 날짜는 조회할 수 없다.
- 조회 기간은 최대 366일이다. 그보다 길면 `400 Bad Request`다.
- 지정한 `startDate`~`endDate`의 모든 날짜를 반환한다(월 경계를 넘어도 하나의 응답에 담긴다).

## Response

### Body

| Fields                                          | Type     | Format       | Description                                                       |
| ----------------------------------------------- | -------- | ------------ | ----------------------------------------------------------------- |
| `result`                                        | `string` | `success`    | 처리 결과                                                         |
| `status`                                        | `number` | `200`        | HTTP 상태 코드                                                    |
| `message`                                       | `string` |              | 성공 시 빈 문자열                                                 |
| `data.startDate`                                | `string` | `yyyy-MM-dd` | 요청한 조회 시작일                                                |
| `data.endDate`                                  | `string` | `yyyy-MM-dd` | 요청한 조회 종료일                                                |
| `data.data`                                     | `array`  |              | 날짜별 정산 데이터 목록                                           |
| `data.data[].date`                              | `string` | `yyyy-MM-dd` | 정산 기준일(KST)                                                  |
| `data.data[].content.payingCoin`                | `object` |              | 작품 구매 시 사용한 코인                                          |
| `data.data[].content.payingCoin.freeCoin`       | `number` | 정수         | 무료 포인트 사용액(작품 구매)                                     |
| `data.data[].content.payingCoin.paidCoin`       | `number` | 정수         | 유료 코인 사용액(작품 구매)                                       |
| `data.data[].content.chargeCoin`                | `number` | 정수         | 유료 코인 충전액(코인 구매)                                       |
| `data.data[].usedReward`                        | `number` | 정수         | 매체로 지급(실현)된 리워드 합계(원화). 재화·소스 구분 없이 단일값 |
| `data.data[].receivedReward.mission`            | `object` |              | 미션에서 발생(적립)한 재화별 리워드                               |
| `data.data[].receivedReward.buzzvil`            | `object` |              | 버즈빌(보상형)에서 발생한 재화별 리워드                           |
| `data.data[].receivedReward.rc`                 | `object` |              | RC에서 발생한 재화별 리워드                                       |
| `receivedReward.{mission,buzzvil,rc}.direct`    | `number` | 정수         | 직접 지급 리워드 포인트 수량(원화 아님)                           |
| `receivedReward.{mission,buzzvil,rc}.ticket`    | `number` | 정수         | 티켓 리워드 수량(원화 아님)                                       |
| `receivedReward.{mission,buzzvil,rc}.goldenKey` | `number` | 정수         | 황금열쇠 리워드 수량(원화 아님)                                   |
| `receivedReward.{mission,buzzvil,rc}.earning`   | `number` | 정수         | 알바비 리워드 포인트 수량(원화 아님)                              |
| `data.data[].ad.adcash`                         | `number` | 정수         | AdCash 광고 매출                                                  |
| `data.data[].ad.adforus`                        | `number` | 정수         | Adforus 광고 매출                                                 |
| `data.data[].ad.adsense`                        | `number` | 정수         | AdSense 광고 매출                                                 |
| `data.data[].ad.adpopcorn`                      | `number` | 정수         | Adpopcorn 광고 매출                                               |
| `data.data[].ad.buzzvil`                        | `number` | 정수         | Buzzvil 광고 매출                                                 |
| `data.data[].ad.rc`                             | `number` | 정수         | 비토스 RC 광고 매출                                               |
| `data.data[].ad.tossMini`                       | `number` | 정수         | Toss Mini 광고 매출(Toss RC 포함)                                 |

- 이 API는 채널사와 무관하게 **전체 앱을 합산한 값**을 반환한다. 특정 채널·앱 단위 조회는 지원하지 않으며, 응답에 `channel` 필드도 없다.
- `content`의 `payingCoin`과 `chargeCoin`은 서로 다른 개념이다:
  - `payingCoin.freeCoin`: 사용자가 **작품을 구매할 때 사용한 무료 포인트**(PointTransaction txType=40 refType=60)
  - `payingCoin.paidCoin`: 사용자가 **작품을 구매할 때 사용한 유료 코인**(CashTransaction txType=40 refType=60)
  - `chargeCoin`: 사용자가 **코인을 구매(충전)한 총액**(CashTransaction txType=10)
  - 둘 다 환불·결제수수료 개념이 없으며, 과세/면세 구분도 없다(합계 금액만 제공).
  - `usedReward`와 `ad`는 차감 없는 총액

  ```text
  content.payingCoin.freeCoin = 작품 구매 시 사용한 무료 포인트액
  content.payingCoin.paidCoin = 작품 구매 시 사용한 유료 코인액
  content.chargeCoin          = 유료 코인 충전액
  ```

- `content`/`usedReward`/`ad`의 금액은 모두 원화 정수다. 각 필드에 소수점이 남으면 해당 필드만 절사한다. 별도 합계(total) 필드는 없다.
- `receivedReward`는 원화가 아니라 **재화 원장에 쌓인 수량 그대로**다(포인트→원화 환율 미적용). `direct`은 `Reward.reward`(포인트), `ticket`은 `TicketTransaction.amount`(티켓 수), `goldenKey`는 `GoldenKeyTransaction.amount`(황금열쇠 수), `earning`은 `EarningTransaction.amount`/`RCPayload.rewardAmount`(알바비 포인트) 합계다. 응답값은 정수로 절사되지만 통화 환산은 하지 않는다.
- 반환 대상 날짜는 항상 `content`/`usedReward`/`receivedReward`/`ad`의 모든 필드를 포함하며, 해당 항목의 합산 금액이 없으면 `0`으로 채운다.
- `usedReward`(지급/실현 기준)와 `receivedReward`(발생/적립 기준)는 서로 다른 개념이다. 매체 다이렉트 적립(일반 리워드)은 두 값이 같지만, 티켓·황금열쇠·알바비처럼 재화로 쌓였다가 나중에 실현되는 경우 값이 다를 수 있다.
- `receivedReward.rc`는 구조상 `direct`/`ticket`/`goldenKey`가 항상 `0`이다. RC는 알바비로만 발생한다.
- `ad.tossMini`는 Toss RC를 포함한 매출 전체다.
- 같은 range를 반복 조회해도 결과는 대체로 동일하지만, 최근 4일은 재집계·재조회로 값이 달라질 수 있다.

## Status

| StatusCode | 상태 | Description                                                                                                                              |
| ---------: | ---- | ---------------------------------------------------------------------------------------------------------------------------------------- |
|      `200` | 성공 | 요청 처리 성공                                                                                                                           |
|      `400` | 실패 | `startDate`/`endDate` 형식 오류, `startDate > endDate`, `startDate < 2026-01-01`, `endDate`가 KST 기준 오늘 이후, 조회 기간이 366일 초과 |
|      `401` | 실패 | `Authorization` 헤더 누락, Basic 형식 아님, 또는 `channelID`/`channelSecret` 불일치                                                      |
|      `403` | 실패 | 인증된 채널이 `guru`가 아님                                                                                                              |
|      `404` | 실패 | 지원하지 않는 HTTP 메서드. 응답 body 없음                                                                                                |
|      `500` | 실패 | 예상하지 못한 서버 오류                                                                                                                  |

## 성공 응답 예시

```json
{
  "result": "success",
  "status": 200,
  "message": "",
  "data": {
    "startDate": "2026-08-01",
    "endDate": "2026-08-19",
    "data": [
      {
        "date": "2026-08-01",
        "content": {
          "payingCoin": {
            "freeCoin": 1290000,
            "paidCoin": 9876000
          },
          "chargeCoin": 12000000
        },
        "usedReward": 234000,
        "receivedReward": {
          "mission": {
            "direct": 1200,
            "ticket": 8,
            "goldenKey": 3,
            "earning": 5000
          },
          "buzzvil": {
            "direct": 800,
            "ticket": 0,
            "goldenKey": 0,
            "earning": 0
          },
          "rc": { "direct": 0, "ticket": 0, "goldenKey": 0, "earning": 1500 }
        },
        "ad": {
          "adcash": 100000,
          "adforus": 50000,
          "adsense": 30000,
          "adpopcorn": 20000,
          "buzzvil": 150000,
          "rc": 60000,
          "tossMini": 40000
        }
      }
    ]
  }
}
```

## 실패 응답 예시

### 400 Bad Request

```json
{
  "result": "failure",
  "status": 400,
  "message": "올바르지 않은 요청입니다.",
  "code": "err_validation",
  "data": null,
  "errors": [
    {
      "code": "custom",
      "message": "종료일은 KST 기준 어제보다 늦을 수 없습니다.",
      "path": []
    }
  ]
}
```

`startDate`/`endDate`가 형식을 벗어나거나(`errors[].path`에 `startDate` 또는 `endDate`), 순서·하한·상한·기간 규칙을 어긴 경우(`errors[].path`는 `[]`) 모두 같은 `err_validation` 코드로 400을 반환한다.

### 401 Unauthorized

```json
{
  "result": "failure",
  "status": 401,
  "message": "인증되지 않은 계정입니다.",
  "code": "err_not_exist_authority",
  "data": null
}
```

### 403 Forbidden

```json
{
  "result": "failure",
  "status": 403,
  "message": "접근 권한이 없습니다.",
  "code": "err_not_exist_authority",
  "data": null
}
```

### 404 Not Found

지원하지 않는 HTTP 메서드로 호출한 경우 응답 body가 없다.

### 500 Internal Server Error

```json
{
  "result": "failure",
  "status": 500,
  "message": "서버 오류가 발생했습니다.",
  "code": "err_unhandled",
  "data": null
}
```

## 사용 예시

### 특정 월 전체 조회

```bash
curl -X GET "https://admin.treasurecomics.com/api/internal/v1/settlements/daily?startDate=20260801&endDate=20260831" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic <base64(channelID:channelSecret)>"
```

### 월 경계를 넘는 range 조회(예: "최근 7일"이 7월 말~8월 초에 걸치는 경우)

```bash
curl -X GET "https://admin.treasurecomics.com/api/internal/v1/settlements/daily?startDate=20260729&endDate=20260804" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic <base64(channelID:channelSecret)>"
```
