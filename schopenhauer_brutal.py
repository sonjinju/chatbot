from __future__ import annotations

# 표준 라이브러리: 랜덤 문구 선택, 정규식 매칭
import random
import re
# 간단한 응답 객체 표현용
from dataclasses import dataclass
from typing import Literal

# 독설 강도는 1/3/5 세 값만 허용
Heat = Literal[1, 3, 5]

# 안전 우선: 자해/자살 위험 신호 감지 패턴
_SELF_HARM_RE = re.compile(r"(죽고|자살|끝내고\s*싶|사라지고\s*싶)", re.IGNORECASE)
# 주제 분류용 키워드 패턴
_TOPIC_RE = {
    "love": re.compile(r"(사랑|연애|이별|집착|짝사랑)"),
    "anxiety": re.compile(r"(불안|걱정|공포|두려|미래)"),
    "low": re.compile(r"(우울|무기력|허무|공허|의미)"),
    "work": re.compile(r"(돈|직장|회사|퇴사|취업|면접|상사)"),
}


@dataclass(frozen=True)
class Reply:
    # 최종 답변 텍스트
    text: str
    # 사용된 독설 레벨(1/3/5)
    heat: Heat


class SchopenhauerBrutalModel:
    """
    로컬 규칙 기반 '독설가 쇼펜하우어' 챗봇 엔진.

    - heat: 1(현실 조언) / 3(냉정한 분석) / 5(직면 강화)
    """

    def __init__(self, seed: int | None = None) -> None:
        # 테스트 재현 가능성을 위해 시드 주입 가능
        self._rng = random.Random(seed)

    @staticmethod
    def _clamp_heat(n: int) -> Heat:
        # 입력값을 1/3/5 중 하나로 정규화
        return 1 if n <= 1 else 5 if n >= 5 else 3

    def _pick(self, xs: list[str]) -> str:
        # 후보 문장 중 하나를 랜덤 선택
        return self._rng.choice(xs)

    def generate(self, user_text: str, heat: int | Heat = 3) -> Reply:
        # 사용자 입력 정리 + 독설 강도 정규화
        t = (user_text or "").strip()
        lvl = self._clamp_heat(int(heat))

        # 빈 입력 처리
        if not t:
            return Reply("질문이 있다면 짧고 명확하게. 필요한 것만 말해라.", lvl)

        # 자해/자살 신호는 즉시 안전 가이드 우선 응답
        if _SELF_HARM_RE.search(t):
            return Reply(
                "지금은 철학이 아니라 안전이 먼저다.\n"
                "즉시 주변 사람에게 연락하거나, 긴급 상황이면 지역 긴급번호로 도움을 요청해라.\n"
                "가능하면 지금 (1) 어디에 있는지 (2) 혼자인지 (3) 위험한 물건이 가까이 있는지부터 말해라.",
                lvl,
            )

        # 레벨별 시작 문구(톤)
        tone_open = {
            1: [
                "좋아. 감정은 사실이고, 다음은 행동이다.",
                "현실적으로 정리하자. 바꿀 수 있는 것부터.",
                "좋다. 오늘 하루만 버티는 방식부터 만들자.",
            ],
            3: [
                "네 말은 고통의 형태를 드러낸다.",
                "표상 뒤에 숨은 동기를 보자.",
                "좋다. 의지가 어떻게 너를 끄는지 보자.",
            ],
            5: [
                "헛된 낙관은 필요 없다. 사실만 말해라.",
                "미화는 접어. 너의 반복 패턴부터 보자.",
                "듣기 좋은 말은 빼겠다. 직면해라.",
            ],
        }[lvl]

        # 레벨별 반추 질문(생각 확장)
        tone_reflect = {
            1: [
                "지금 당장 할 ‘가장 작은 한 걸음’은 뭐지?",
                "우선순위 1개만 고르면 뭔가?",
                "오늘 10분만 쓸 수 있다면 어디에 쓰겠나?",
            ],
            3: [
                "너는 진짜로 무엇을 원하나?",
                "그 감정은 어떤 기대가 좌절된 결과지?",
                "이 고통이 반복된다면, 반복을 만드는 습관은 뭐지?",
            ],
            5: [
                "해결을 원하는 건가, 위로를 소비하는 건가?",
                "‘나는 원래 그래’라는 면허로 무엇을 회피하지?",
                "지금 너를 망치는 건 ‘상황’이 아니라 ‘반복되는 선택’일 수 있다. 그 선택이 뭐지?",
            ],
        }[lvl]

        # 레벨별 마무리 문구(행동 촉구)
        tone_close = {
            1: [
                "오늘 1개만 하자. 작아도 반복되면 바뀐다.",
                "지금 결론 내리지 말고 24시간만 숨을 고르자.",
            ],
            3: [
                "욕망을 줄이는 만큼 고통도 줄어든다.",
                "통제할 수 있는 것과 없는 것을 나눠라. 나머지는 놓아라.",
            ],
            5: [
                "변명 말고 행동 하나를 고르자. 아니면 이 대화도 소비로 끝난다.",
                "계속 이렇게 살 거면, 계속 이렇게 괴로울 거다. 선택해라.",
            ],
        }[lvl]

        # 각 묶음에서 랜덤 1개씩 선택
        openers = self._pick(tone_open)
        reflect = self._pick(tone_reflect)
        closer = self._pick(tone_close)

        # 주제: 사랑/집착
        if _TOPIC_RE["love"].search(t):
            core = (
                "그건 사랑이 아니라 결핍을 채우려는 의지일 가능성이 크다."
                if lvl == 5
                else "사랑은 종종 두 의지의 충돌이다."
            )
            return Reply(f"{openers} {core}\n{reflect}\n{closer}", lvl)

        # 주제: 불안/미래
        if _TOPIC_RE["anxiety"].search(t):
            tail = (
                "오늘 10분만: 해야 할 일 1개 적고 그 1개만 처리해라."
                if lvl == 1
                else '미래를 붙잡으려는 의지가 불안을 만든다. "불필요한 욕망"을 하나 내려놔라.'
            )
            return Reply(f"{openers} 불안은 통제 욕구의 경련이다.\n{reflect}\n{tail}", lvl)

        # 주제: 무기력/허무
        if _TOPIC_RE["low"].search(t):
            core = (
                "의미를 찾느라 시간을 태우는 동안 삶은 너를 기다려주지 않는다."
                if lvl == 5
                else "의미를 찾는 집착이 허무를 키운다."
            )
            return Reply(
                f"{openers} {core}\n"
                "자극(쇼츠/뉴스/과소비)을 하루만 끊고 20분 산책해라.\n"
                f"{closer}",
                lvl,
            )

        # 주제: 돈/직장/생존 노동
        if _TOPIC_RE["work"].search(t):
            core = (
                '핵심: "인정" 게임은 끝이 없다. "피로의 총량"을 줄이는 설계를 해라.'
                if lvl == 5
                else '기준을 바꿔라: "인정"보다 "피로의 총량"을 줄여라.'
            )
            return Reply(f"{openers} 노동은 생존 장치다.\n{reflect}\n{core}", lvl)

        # 어떤 주제에도 강하게 매칭되지 않을 때의 기본 안내
        default_prompt = {
            1: "현실적으로 답해라. (1) 지금 당장 가능한 행동 1개 (2) 그 행동을 막는 핑계 1개.",
            3: "정리해라. (1) 사실 (2) 해석 (3) 욕망 — 셋 중 무엇이 너를 제일 흔드는지 말해라.",
            5: "핵심만 말해라. 2~3문장으로 정리해라: (1) 지금 사실 (2) 네가 원하는 것 (3) 그걸 막는 것.",
        }[lvl]

        # 기본 응답 반환
        return Reply(
            f"{openers}\n{reflect}\n{default_prompt}",
            lvl,
        )


def _cli() -> None:
    # 로컬 테스트용 CLI 루프
    bot = SchopenhauerBrutalModel(seed=7)
    print("독설가 쇼펜하우어(로컬 규칙 기반) — 종료: exit/quit")
    while True:
        # 사용자 입력 받기
        q = input("YOU> ").strip()
        if q.lower() in {"quit", "exit"}:
            break
        # 독설 레벨 입력(기본 3)
        heat_raw = input("HEAT(1/3/5)> ").strip() or "3"
        try:
            heat = int(heat_raw)
        except ValueError:
            # 숫자 외 입력 시 중간 강도 사용
            heat = 3
        # 모델 호출 후 출력
        r = bot.generate(q, heat=heat)
        print(f"BOT[Lv{r.heat}]> {r.text}\n")


if __name__ == "__main__":
    # 직접 실행 시 CLI 모드 시작
    _cli()

