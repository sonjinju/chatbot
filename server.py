from __future__ import annotations

# 경로 계산용 표준 라이브러리
from pathlib import Path

# FastAPI 핵심 컴포넌트
from fastapi import FastAPI
# 브라우저에서 다른 출처 요청 허용(CORS)
from fastapi.middleware.cors import CORSMiddleware
# 파일 응답(HTML 반환)용
from fastapi.responses import FileResponse
# 정적 파일(CSS/JS/이미지) 서빙용
from fastapi.staticfiles import StaticFiles
# 요청/응답 데이터 검증용
from pydantic import BaseModel, Field

# 로컬 규칙 기반 챗봇 엔진
from schopenhauer_brutal import SchopenhauerBrutalModel

# FastAPI 앱 생성
app = FastAPI(title="Schopenhauer Brutal (Rule-based)")

# CORS 설정: 임시 테스트 용도로 전체 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 프로젝트 루트 경로(현재 파일 위치 기준)
BASE_DIR = Path(__file__).resolve().parent
# /static 경로에 정적 파일 디렉터리 마운트
app.mount("/static", StaticFiles(directory=BASE_DIR), name="static")

# 챗봇 모델 인스턴스(시드 고정으로 재현성 확보)
bot = SchopenhauerBrutalModel(seed=7)


# /reply 요청 바디 스키마
class ReplyRequest(BaseModel):
    # 사용자 입력 텍스트(최대 800자)
    text: str = Field(..., max_length=800)
    # 독설 레벨: 1/3/5를 기대(모델 내부에서 최종 정규화)
    heat: int = Field(3, description="1/3/5")


# /reply 응답 바디 스키마
class ReplyResponse(BaseModel):
    # 생성된 답변
    reply: str
    # 최종 적용된 독설 레벨
    heat: int


@app.get("/")
def root() -> FileResponse:
    # 웹앱 진입점(index.html) 반환
    return FileResponse(BASE_DIR / "index.html")



@app.post("/reply", response_model=ReplyResponse)
def reply(req: ReplyRequest) -> ReplyResponse:
    # 요청 텍스트와 레벨을 모델에 전달해 답변 생성
    r = bot.generate(req.text, heat=req.heat)
    # 검증된 응답 스키마 형태로 반환
    return ReplyResponse(reply=r.text, heat=int(r.heat))

