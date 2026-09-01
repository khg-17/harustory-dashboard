# 일별 정산 데이터 제공 API Handoff

> 일별 정산 데이터 조회 API를 사용하는 내부 담당자에게 전달하는 호출 명세
> 담당자 조성진

## API 정보

| 항목        | 내용                                                                                                |
| ----------- | --------------------------------------------------------------------------------------------------- |
| Endpoint    | `https://admin.treasurecomics.com/api/internal/v1/settlements/daily`                                |
| HTTP Method | `GET`                                                                                               |
| Description | 구루 전체 앱의 일별 콘텐츠·리워드·광고 매출 데이터를 앱별로 분해해 임의 날짜 범위로 제공하는 내부 read API입니다. |

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

| Name        | Type     | Format          | Required | Nullable | Description                                  |
| ----------- | -------- | --------------- | -------- | -------- | --------------------------------------------- |
| `startDate` | `string` | `yyyyMMdd`      | Y        | N        | 조회 시작일(포함, KST)                        |
| `endDate`   | `string` | `yyyyMMdd`      | Y        | N        | 조회 종료일(포함, KST)                        |
| `appSN`     | `string` | CSV (`3,17,19`) | N        | Y        | 조회할 앱 SN 목록. 미지정/빈 문자열이면 전체 앱 |

- `startDate`/`endDate`는 모두 보내야 한다. 형식을 벗어나면 `400 Bad Request`를 반환한다.
- `appSN`은 콤마로 구분한 양의 정수 CSV만 허용한다(예: `3,17,19`). 지정하지 않으면 전체 앱을 반환한다.
- `startDate`가 `endDate`보다 늦으면 `400 Bad Request`다.
- `startDate`는 `2026-01-01` 이전일 수 없다.
- `endDate`는 KST 기준 어제(D-1)보다 늦을 수 없다 — 오늘 이후 날짜는 조회할 수 없다.
- 조회 기간은 최대 366일이다. 그보다 길면 `400 Bad Request`다.
- 지정한 `startDate`~`endDate`의 모든 날짜를 반환한다(월 경계를 넘어도 하나의 응답에 담긴다).

## Response

### Body

| Fields                                                | Type     | Format       | Description                                                       |
| ------------------------------------------------------ | -------- | ------------ | ------------------------------------------------------------------- |
| `result`                                                | `string` | `success`    | 처리 결과                                                          |
| `status`                                                | `number` | `200`        | HTTP 상태 코드                                                     |
| `message`                                               | `string` |              | 성공 시 빈 문자열                                                  |
| `data.startDate`                                        | `string` | `yyyy-MM-dd` | 요청한 조회 시작일                                                 |
| `data.endDate`                                          | `string` | `yyyy-MM-dd` | 요청한 조회 종료일                                                 |
| `data.data`                                             | `array`  |              | 날짜별 정산 데이터 목록                                            |
| `data.data[].date`                                      | `string` | `yyyy-MM-dd` | 정산 기준일(KST)                                                   |
| `data.data[].apps`                                      | `array`  |              | 해당 날짜의 앱별 정산 데이터 목록                                  |
| `apps[].appSN`                                          | `number` |              | 앱 ID                                                              |
| `apps[].appName`                                        | `string\|null` |        | 앱명. 등록돼 있지 않으면 `null`                                    |
| `apps[].payingCoin.freeCoin`                            | `number` | 정수         | 작품 구매 시 사용한 무료 포인트 수량                               |
| `apps[].payingCoin.paidCoin`                            | `number` | 정수         | 작품 구매 시 사용한 유료 코인 수량                                 |
| `apps[].chargeCoin`                                     | `number` | 정수         | 유료 코인 충전(구매) 수량                                          |
| `apps[].adFree`                                         | `object` |              | `purchaseType=13`(광고무 사용)이 존재하는 앱·일자의 광고사별 매출  |
| `apps[].adFree.adcash`                                  | `number` | 정수         | AdCash 광고무 매출(원화)                                           |
| `apps[].adFree.adforus`                                 | `number` | 정수         | Adforus 광고무 매출(원화)                                          |
| `apps[].adFree.apWebCPC`                                | `number` | 정수         | Adpopcorn(WebCPC) 광고무 매출(원화)                                |
| `apps[].adFree.buzzvil`                                 | `number` | 정수         | Buzzvil 광고무 매출(원화)                                          |
| `apps[].adFree.tossMini`                                | `number` | 정수         | Toss Mini 광고무 매출(원화)                                        |
| `apps[].adFree.adsense`                                 | `number` | 정수         | AdSense 광고무 매출(원화)                                          |
| `apps[].contentRevenue`                                 | `number` | 정수         | `일별_앱매출_콘텐츠사용_유료코인` + 광고무 광고사별 매출 합계      |
| `apps[].usedReward`                                     | `number` | 정수         | 매체로 지급(실현)된 리워드 합계(원화)                              |
| `apps[].receivedReward.mission`                         | `object` |              | 미션에서 발생(적립)한 재화별 리워드                                |
| `apps[].receivedReward.buzzvil`                         | `object` |              | 버즈빌(보상형)에서 발생한 재화별 리워드                            |
| `apps[].receivedReward.rc`                              | `object` |              | RC에서 발생한 재화별 리워드                                        |
| `receivedReward.{mission,buzzvil,rc}.direct`            | `number` | 정수         | 직접 지급 리워드 수량                                              |
| `receivedReward.{mission,buzzvil,rc}.ticket`            | `number` | 정수         | 티켓 리워드 수량                                                   |
| `receivedReward.{mission,buzzvil,rc}.goldenKey`         | `number` | 정수         | 황금열쇠 리워드 수량                                               |
| `receivedReward.{mission,buzzvil,rc}.earning`           | `number` | 정수         | 알바비 리워드 수량                                                 |
| `apps[].ad.adcash`                                      | `number` | 정수         | AdCash 광고 매출                                                   |
| `apps[].ad.adforus`                                     | `number` | 정수         | Adforus 광고 매출                                                  |
| `apps[].ad.apWebCPC`                                    | `number` | 정수         | Adpopcorn(WebCPC) 광고 매출                                        |
| `apps[].ad.buzzvil`                                     | `number` | 정수         | Buzzvil 광고 매출                                                  |
| `apps[].ad.rc`                                          | `number` | 정수         | 비토스 RC 광고 매출                                                |
| `apps[].ad.tossMini`                                    | `number` | 정수         | Toss Mini 광고 매출(Toss RC 포함)                                  |

`adFree`는 해당 앱·KST 일자에 광고무 사용(`PurchaseContents.purchaseType=13`)이 존재하는 경우만 집계한다. 면세·과세는 분리하지 않고 광고사별 매출 합계로 제공한다.

## Status

| StatusCode | 상태 | Description                                                                                                                              |
| ---------: | ---- | ---------------------------------------------------------------------------------------------------------------------------------------- |
|      `200` | 성공 | 요청 처리 성공                                                                                                                           |
|      `400` | 실패 | `startDate`/`endDate` 형식 오류, `startDate > endDate`, `startDate < 2026-01-01`, `endDate`가 KST 기준 오늘 이후, 조회 기간이 366일 초과, `appSN`이 양의 정수 CSV가 아님 |
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
    "endDate": "2026-08-01",
    "data": [
      {
        "date": "2026-08-01",
        "apps": [
          {
            "appSN": 3,
            "appName": "비트버니",
            "payingCoin": { "freeCoin": 310000, "paidCoin": 2100000 },
            "chargeCoin": 2800000,
            "adFree": {
              "adcash": 2100,
              "adforus": 377,
              "apWebCPC": 500,
              "buzzvil": 200,
              "tossMini": 0,
              "adsense": 100
            },
            "contentRevenue": 2003277,
            "usedReward": 42000,
            "receivedReward": {
              "mission": { "direct": 400, "ticket": 2, "goldenKey": 1, "earning": 1800 },
              "buzzvil": { "direct": 120, "ticket": 0, "goldenKey": 0, "earning": 0 },
              "rc": { "direct": 0, "ticket": 0, "goldenKey": 0, "earning": 900 }
            },
            "ad": {
              "adcash": 310000,
              "adforus": 0,
              "apWebCPC": 44000,
              "buzzvil": 12000,
              "rc": 8300,
              "tossMini": 0
            }
          }
        ]
      }
    ]
  }
}
```

이 예시는 `payingCoin.paidCoin=2100000`과 별개로, 원충전 `txSubType=1010`을 제외한 `일별_앱매출_콘텐츠사용_유료코인=2000000`을 가정한다. 유료코인 소진은 1코인=1원으로 보고 `Σ adFree=3277`을 더해 `contentRevenue=2003277`로 계산한다.

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

### 특정 월 전체 조회 (전체 앱)

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

### 특정 앱만 조회 (`appSN` 필터)

```bash
curl -X GET "https://admin.treasurecomics.com/api/internal/v1/settlements/daily?startDate=20260801&endDate=20260819&appSN=3,17,19" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic <base64(channelID:channelSecret)>"
```
