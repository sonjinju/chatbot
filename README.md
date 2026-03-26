# 🧛‍♂️ 쇼펜하우어 독설 챗봇 (Schopenhauer Brutal Chatbot)

비관주의 철학자 아서 쇼펜하우어의 페르소나를 빌려, 사용자의 고민에 냉소적이고 날카로운 조언을 제공하는 AI 챗봇 프로젝트입니다.

---

## 🏗️ System Architecture (전체 데이터 흐름)

본 프로젝트는 클라이언트의 요청부터 AI의 답변 생성까지 다음과 같은 **3계층 구조(3-Tier Architecture)**로 설계되었습니다.

```mermaid
graph LR
    A[User/Web Browser] --- B[Front-end: UI Rendering]
    B --- C[Back-end: API Server]
    C --- D[AI Engine: Brutal Logic]
