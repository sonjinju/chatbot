// -------------------------------------------------------
// DOM 유틸
// -------------------------------------------------------
// id로 요소를 빠르게 가져오기 위한 헬퍼
const $ = (id) => document.getElementById(id);

// -------------------------------------------------------
// UI 참조 모음
// -------------------------------------------------------
// 자주 접근하는 요소들을 한 객체로 묶어 가독성 향상
const UI = {
  messages: $("messages"),
  composer: $("composer"),
  prompt: $("prompt"),
  resetBtn: $("resetBtn"),
  sendBtn: $("sendBtn"),
  heatButtons: Array.from(document.querySelectorAll("[data-heat]")),
  quickButtons: Array.from(document.querySelectorAll("[data-quick]")),
};

// -------------------------------------------------------
// 저장 키 / 템플릿 데이터
// -------------------------------------------------------
// localStorage 키 이름 상수
const STORAGE = {
  history: "schopenhauer_chat_v1",
  heat: "schopenhauer_heat_v1",
};

// 빠른 주제 버튼 클릭 시 입력창에 자동 삽입할 문장들
const QUICK_TEMPLATES = {
  인간관계: "인간관계가 너무 지쳐요. 제가 반복하는 패턴이 뭔지 냉정하게 봐주세요.",
  "돈/미래": "돈과 미래가 불안해요. 현실적으로 제가 통제할 수 있는 것부터 정리해 주세요.",
  "사랑/집착": "사랑인지 집착인지 모르겠어요. 제 마음을 해부해서 설명해 주세요.",
  무기력: "무기력해서 아무것도 하기 싫어요. 왜 이렇게 되는지, 뭘 줄여야 하는지 말해 주세요.",
  "그냥 다 싫음": "그냥 다 싫고 다 귀찮아요. 제가 뭘 회피하는지 직면하게 해주세요.",
};

// -------------------------------------------------------
// 공통 유틸 함수
// -------------------------------------------------------
// 문자열 정리: null/undefined 방어 후 trim
function normalize(value) {
  return (value ?? "").toString().trim();
}

// 독설 레벨을 1/3/5 중 하나로 정규화
function clampHeat(n) {
  const v = Number(n);
  if (v <= 1) return 1;
  if (v >= 5) return 5;
  return 3;
}

// 메시지 시각 표시용 HH:MM 포맷
function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// 텍스트를 안전한 HTML로 치환(XSS 방지) -> 보안용어 (Cross-Site Scripting)
function escapeText(text) {
  const div = document.createElement("div");
  div.textContent = String(text ?? "");
  return div.innerHTML;
}

// 입력창에 문장을 넣고 커서를 끝으로 이동
function setPrompt(text) {
  UI.prompt.value = text;
  UI.prompt.focus();
  UI.prompt.setSelectionRange(UI.prompt.value.length, UI.prompt.value.length);
}

// localStorage JSON 로드(실패 시 fallback)
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// localStorage JSON 저장
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// 저장된 독설 레벨 로드
function loadHeat() {
  const raw = localStorage.getItem(STORAGE.heat);
  const n = Number(raw);
  return clampHeat(Number.isFinite(n) ? n : 3);
}

// 독설 레벨 저장
function saveHeat(heat) {
  localStorage.setItem(STORAGE.heat, String(clampHeat(heat)));
}

// 독설 레벨 버튼의 aria-pressed 상태 반영
function applyHeatUI(heat) {
  for (const btn of UI.heatButtons) {
    const v = clampHeat(btn.getAttribute("data-heat"));
    btn.setAttribute("aria-pressed", String(v === heat));
  }
}

// 메시지 한 건을 채팅창에 렌더링
function renderMessage({ role, text, time }) {
  const wrap = document.createElement("div");
  wrap.className = `msg ${role === "user" ? "msg--user" : "msg--bot"}`;

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.innerHTML = `
    <span class="badge">${role === "user" ? "나" : "쇼펜하우어"}</span>
    <span>${escapeText(time)}</span>
  `;

  const body = document.createElement("div");
  body.className = "body";
  body.innerHTML = escapeText(text);

  wrap.appendChild(meta);
  wrap.appendChild(body);
  UI.messages.appendChild(wrap);
  UI.messages.scrollTop = UI.messages.scrollHeight;
}

// 저장된 히스토리 로드 + 최소 유효성 검사
function loadHistory() {
  const data = loadJSON(STORAGE.history, []);
  if (!Array.isArray(data)) return [];
  return data.filter(
    (m) =>
      m &&
      (m.role === "user" || m.role === "bot") &&
      typeof m.text === "string" &&
      typeof m.time === "string"
  );
}

// 히스토리 저장(최대 200개 유지)
function saveHistory(history) {
  saveJSON(STORAGE.history, history.slice(-200));
}

// 배열에서 랜덤 요소 선택
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// -------------------------------------------------------
// 브라우저 폴백용 규칙 기반 응답 엔진
// -------------------------------------------------------
// 서버가 꺼졌을 때 사용되는 JS 내장 응답 생성기
function schopenhauerReply(userText, level) {
  const t = normalize(userText);
  const low = t.toLowerCase();

  // 레벨 정규화
  const lvl = clampHeat(Number(level));

  // 레벨별 시작 문구
  const openersLv1 = [
    "좋아요. 감정은 사실이고, 그 다음에 선택이 옵니다.",
    "지금은 버티는 법부터 정리해 봅시다.",
    "현실적으로 풀어봅시다. 바꿀 수 있는 것부터요.",
    "좋습니다. 당신의 상황을 더 또렷하게 만들면 해결이 쉬워집니다.",
  ];
  const openersLv3 = [
    "당신의 말은 고통의 형태를 드러냅니다.",
    "우리는 스스로를 설명한다고 믿지만, 대개 의지가 우리를 끕니다.",
    "좋습니다. 표상 뒤에 숨은 동기를 봅시다.",
    "그 질문은 삶의 핵심을 건드립니다.",
  ];
  const openersLv5 = [
    "좋아요. 미화는 접고, 사실만 봅시다.",
    "듣기 좋은 말은 빼겠습니다. 지금 필요한 건 직면입니다.",
    "당신은 설명을 찾고 있지만, 실제로는 합리화에 기대고 있어요.",
    "자존심을 잠깐 내려놓고, 당신이 반복하는 패턴부터 보죠.",
  ];
  const openers = lvl <= 1 ? openersLv1 : lvl >= 5 ? openersLv5 : openersLv3;

  // 레벨별 마무리 문구
  const closersLv1 = [
    "오늘은 한 가지 작은 행동만 정해요. 작아도 반복되면 상황이 바뀝니다.",
    "당장 결론 내리지 말고, 24시간만 숨을 고르세요.",
    "당신 탓으로만 돌리지 말고, 구조와 조건도 함께 보세요.",
    "가능한 선택지를 2~3개로 줄여봅시다. 그게 불안을 낮춥니다.",
  ];
  const closersLv3 = [
    "한 걸음 물러나 관찰해 보세요. 의지는 관찰될 때 힘을 잃습니다.",
    "욕망을 덜어내는 만큼, 마음은 덜 흔들립니다.",
    "고통을 없애려 애쓰기보다, 고통을 낳는 갈망을 줄이세요.",
    "세상은 바뀌지 않을 수 있습니다. 그러나 당신의 태도는 훈련될 수 있습니다.",
  ];
  const closersLv5 = [
    "결국 선택은 당신이 합니다. 다만, 지금처럼 하면 결과도 지금처럼 나옵니다.",
    "당신이 지키는 건 행복이 아니라 익숙함일 수 있어요. 그럼 계속 괴롭습니다.",
    "핑계는 당신을 보호하는 대신, 당신을 같은 자리로 묶어둡니다.",
    "정리하죠. 변명 말고 행동 하나를 고르세요. 아니면 이 대화도 소비로 끝납니다.",
  ];
  const closers = lvl <= 1 ? closersLv1 : lvl >= 5 ? closersLv5 : closersLv3;

  // 레벨별 반추 질문
  const reflectLv1 = [
    "지금 당장 할 수 있는 ‘가장 작은 한 걸음’은 무엇인가요?",
    "당신이 원하는 결과를 1문장으로 말하면 무엇인가요?",
    "이 상황에서 우선순위 1개만 고르면 뭘까요?",
    "오늘 컨디션을 0~10으로 매기면 몇 점이고, 1점 올리려면 뭘 하면 좋을까요?",
  ];
  const reflectLv3 = [
    "그 일에서 당신이 진짜로 원하는 건 무엇입니까?",
    "지금 느끼는 감정은 어떤 기대가 좌절된 결과인가요?",
    "이 고통이 반복된다면, 그 반복을 만드는 습관은 무엇일까요?",
    "당신이 통제할 수 있는 것과 통제할 수 없는 것을 나눠 말해보세요.",
  ];
  const reflectLv5 = [
    "지금 당신을 망치는 건 ‘상황’이 아니라 ‘반복되는 선택’일 가능성이 큽니다. 그 선택이 뭔가요?",
    "당신이 붙잡는 기대가 현실과 충돌하는 지점은 어디죠?",
    "솔직히 말해요. 당신은 지금 해결을 원하는 겁니까, 위로를 소비하는 겁니까?",
    "‘나는 원래 그래’는 설명이 아니라 면허증입니다. 그 면허로 뭘 피하고 있나요?",
  ];
  const reflect = lvl <= 1 ? reflectLv1 : lvl >= 5 ? reflectLv5 : reflectLv3;

  // 빈 입력 처리
  if (!t) return "말을 남기면, 나는 그것을 의지의 흔적으로 읽어보겠습니다.";

  // 인사
  if (/(안녕|하이|hello|hi)\b/i.test(low)) {
    return `${pick(openers)} 무엇이 당신을 여기로 이끌었습니까?`;
  }

  // 감사
  if (/(고마워|감사|thanks)/i.test(low)) {
    return "감사는 잠시 마음을 맑게 합니다. 그러나 맑음도 유지하려 들면 다시 욕망이 됩니다.";
  }

  // 사랑/집착
  if (/(사랑|연애|이별|짝사랑)/i.test(t)) {
    const core =
      lvl >= 5
        ? "사랑이 아니라 집착일 수 있어요. 상대를 원한다기보다, 결핍을 채우려는 거죠."
        : "사랑은 흔히 두 사람의 행복이 아니라, 두 의지의 충돌입니다.";
    return `${pick(openers)} ${core}\n${pick(reflect)}\n${pick(closers)}`;
  }

  // 불안/걱정
  if (/(불안|걱정|공포|두려)/i.test(t)) {
    const tail =
      lvl <= 1
        ? "오늘 10분만: 숨을 고르고, 해야 할 일 1개만 적고, 그 1개만 처리하세요."
        : '오늘 단 한 가지, "하지 않아도 되는 욕망"을 하나 내려놓아 보세요.';
    return `${pick(openers)} 불안은 미래를 붙잡으려는 의지의 경련입니다.\n${pick(reflect)}\n${tail}`;
  }

  // 우울/무기력/허무
  if (/(우울|무기력|허무|의미|공허)/i.test(t)) {
    const mid =
      lvl >= 5
        ? "당신이 ‘의미’를 찾는 동안, 삶은 당신을 기다려주지 않습니다. 지금 할 수 있는 최소 행동이 필요해요."
        : "삶의 의미를 찾는 노력 자체가, 종종 더 깊은 허무를 낳습니다.";
    return `${pick(openers)} ${mid}\n할 수 있다면 작은 금욕을 실험해 보세요: 과도한 자극(뉴스/쇼츠/과음/과소비)을 하루만 끊고, 조용히 산책하세요.\n${pick(closers)}`;
  }

  // 돈/직장
  if (/(돈|직장|회사|상사|퇴사|취업|면접)/i.test(t)) {
    const tail =
      lvl >= 5
        ? '핵심만 말하죠. 당신이 바라는 건 "인정"인데, 그 게임은 끝이 없습니다. "피로의 총량"을 줄이는 쪽으로 설계를 바꾸세요.'
        : '가능하다면 기준을 바꾸세요: "인정"이 아니라 "피로의 총량"을 줄이는 선택을요.';
    return `${pick(openers)} 노동은 생존의 장치이자, 의지가 자신을 유지하는 방식입니다.\n${pick(reflect)}\n${tail}`;
  }

  // 자해/자살 위험 신호
  if (/(죽고|자살|끝내고 싶|사라지고 싶)/i.test(t)) {
    return "당신이 위험한 상태일 수 있어요. 지금은 철학보다 안전이 먼저입니다.\n즉시 주변의 믿을 만한 사람에게 연락하거나, 긴급 상황이면 112/119(한국) 또는 지역 긴급번호로 도움을 요청하세요.\n원하면, 지금 가장 위험한 생각이 올라오는 순간(시간/장소/계기)을 짧게 말해 주세요. 함께 안전 계획부터 세우겠습니다.";
  }

  // 철학 관련 키워드
  if (/(철학|쇼펜하우어|의지|표상)/i.test(t)) {
    return `${pick(openers)} 나는 "의지"를 당신의 욕망/집착/충동의 근원으로, "표상"을 당신이 보고 해석하는 세계의 화면으로 이해해도 좋다고 봅니다.\n${pick(reflect)}`;
  }

  // 기본 응답
  return `${pick(openers)}\n${pick(reflect)}\n당신의 상황을 한 문장으로 더 구체화해 보세요: "나는 ___ 때문에 ___을(를) 원하지만, ___ 때문에 괴롭다."`;
}

// -------------------------------------------------------
// 앱 상태
// -------------------------------------------------------
// 현재 독설 레벨/대화 히스토리
let heat = loadHeat();
let history = loadHistory();

// 초기 렌더: 첫 안내 메시지 보장 + 포커스 이동
function boot() {
  UI.messages.innerHTML = "";
  if (history.length === 0) {
    const hello =
      "헛된 낙관은 여기서 필요 없다—질문이 있다면 짧고 명확하게 필요한 것만 말하라, 인생도 마찬가지다.";
    const m = { role: "bot", text: hello, time: nowTime() };
    history = [m];
    saveHistory(history);
  }
  history.forEach(renderMessage);
  UI.prompt.focus();
}

// 메시지 추가 + 저장 + 렌더
function pushMessage(role, text) {
  const m = { role, text, time: nowTime() };
  history.push(m);
  saveHistory(history);
  renderMessage(m);
}

// 전송 중 입력/버튼 비활성화
function setSending(isSending) {
  UI.prompt.disabled = isSending;
  UI.sendBtn.disabled = isSending;
}

// 서버(/reply) 호출로 답변 받기
async function fetchBotReply(text, heatLevel) {
  const res = await fetch("/reply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, heat: heatLevel }),
  });

  // 비정상 응답은 에러로 처리
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`reply_failed_${res.status}:${msg}`);
  }

  const data = await res.json();
  return data.reply;
}

// -------------------------------------------------------
// 이벤트 바인딩
// -------------------------------------------------------
function wireUI() {
  // 독설 레벨 버튼 이벤트
  for (const btn of UI.heatButtons) {
    btn.addEventListener("click", () => {
      heat = clampHeat(btn.getAttribute("data-heat"));
      saveHeat(heat);
      applyHeatUI(heat);
    });
  }

  // 빠른 주제 버튼 이벤트
  for (const btn of UI.quickButtons) {
    btn.addEventListener("click", () => {
      const topic = normalize(btn.getAttribute("data-quick"));
      setPrompt(QUICK_TEMPLATES[topic] ?? `${topic} 때문에 괴롭습니다.`);
    });
  }

  // 초기화 버튼 이벤트
  UI.resetBtn.addEventListener("click", () => {
    localStorage.removeItem(STORAGE.history);
    history = [];
    boot();
  });
}

// 입력 폼 전송 이벤트
UI.composer.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = normalize(UI.prompt.value);
  if (!text) return;
  UI.prompt.value = "";

  // 사용자 메시지 즉시 렌더
  pushMessage("user", text);
  setSending(true);

  try {
    // 우선: 서버의 파이썬 규칙 모델 사용
    const reply = await fetchBotReply(text, heat);
    pushMessage("bot", reply);
  } catch {
    // 서버 장애 시: 브라우저 내장 규칙으로 폴백
    const fallback = schopenhauerReply(text, heat);
    pushMessage(
      "bot",
      `서버 연결이 안 돼서 로컬(브라우저) 규칙으로 답한다.\n\n${fallback}`
    );
  }

  setSending(false);
  UI.prompt.focus();
});

// -------------------------------------------------------
// 앱 시작
// -------------------------------------------------------
wireUI();
applyHeatUI(heat);
boot();
