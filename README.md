# 쇼펜하우어 독설 챗봇 (Schopenhauer Brutal Chatbot)

비관주의 철학자 아서 쇼펜하우어의 페르소나를 빌려, 사용자의 고민에 냉소적이고 날카로운 조언을 제공하는 AI 챗봇 프로젝트입니다.

---

## System Architecture (전체 데이터 흐름)

본 프로젝트는 클라이언트의 요청부터 AI의 답변 생성까지 다음과 같은 데이터 흐름을 가지고 있습니다.

사용자/Web Browser ↔ Front-end ↔ Back-end ↔ AI Engine

### 상세 역할 분담

- Front-end (index.html / styles.css / app.js)
    - 사용자 질문 입력 및 최종 답변 시각화
    - API 서버와의 실시간 비동기 통신

- Back-end (server.py)
    - Gateway (중계소): 클라이언트의 요청을 수신하고 데이터 유효성 검증
    - 수신된 데이터를 AI 엔진으로 전달하고 최종 답변을 응답

- AI Engine (schopenhauer_brutal.py)
    - Core Logic (핵심 엔진): 쇼펜하우어의 철학적 페르소나 주입
    - Heat Level: 설정된 독설 강도(1, 3, 5단계)에 따라 답변 알고리즘 적용

---

## 주요 기능 (Key Features)

- 강도 조절 시스템: 1(가벼운 훈수) / 3(가차 없는 비판) / 5(자비 없는 독설) 단계별 답변 생성
- 철학적 페르소나: 단순한 욕설이 아닌 쇼펜하우어의 철학적 근거를 바탕으로 한 냉소적 조언
- 실시간 반응형 UI: 깔끔한 웹 인터페이스를 통한 즉각적인 인터랙션
