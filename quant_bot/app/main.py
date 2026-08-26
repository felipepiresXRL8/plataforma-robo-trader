from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.routes import router
from .config import settings

app = FastAPI(
    title="Robô Trader Quantitativo - B3",
    description="Microserviço de Machine Learning (LightGBM) com Feature Engineering e Validação Walk-Forward",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "quant_bot_fastapi",
        "engine": "LightGBM",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
