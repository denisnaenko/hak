import os
from typing import List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from src.model_analyze import save_models_results
from src.model_summarize import save_summarized_result
from src.prompts import get_product_analysis_prompt
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        os.getenv("FRONTEND_URL", "*")
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def fix_json_trailing_commas(text):
    """Удаляет лишние запятые в JSON"""
    # Удаляет запятые перед } и ]
    fixed_text = re.sub(r',\s*}', '}', text)
    fixed_text = re.sub(r',\s*]', ']', fixed_text)
    return fixed_text

# Модель данных для запроса
class ComparisonRequest(BaseModel):
    cardType: List[str]
    banks: List[str]
    criteria: List[str]

# Эндпоинт для сравнения продуктов
@app.post("/api/params")
async def compare_products(request: ComparisonRequest):
    """
    Принимает выбранные параметры, выполняет анализ и возвращает результат
    """
    try:
        print("=== Получены данные ===")
        print(f"Типы карт: {request.cardType}")
        print(f"Банки: {request.banks}")
        print(f"Критерии: {request.criteria}")

        # Преобразуем в массивы Python
        card_types = request.cardType
        banks = request.banks
        criteria = request.criteria

        # Генерируем промпт для анализа
        prompt = get_product_analysis_prompt(banks, criteria)
        
        # Запускаем анализ моделей
        print("=== Запуск анализа моделей ===")
        models_analysis_results = save_models_results(prompt)
        
        # Получаем суммаризированный результат
        print("=== Генерация итогового результата ===")
        summarized_result_dict = save_summarized_result(models_analysis_results)
        
        # Извлекаем текст ответа из словаря
        if isinstance(summarized_result_dict, dict):
            summarized_result = summarized_result_dict.get('response', 'Результат не получен')
        else:
            summarized_result = str(summarized_result_dict)
            summarized_result = fix_json_trailing_commas(summarized_result)
    
    
        
        print("=== Анализ завершен ===")
        print(f"Результат: {summarized_result[:200]}...")  # Выводим первые 200 символов

        # Возвращаем успешный ответ с результатом
        return {
            "status": "success",
            "message": "Анализ успешно выполнен",
            "data": {
                "cardTypes": card_types,
                "banks": banks,
                "criteria": criteria,
                "summarizedResult": summarized_result  # Передаем результат на фронтенд
            }
        }
    
    except Exception as e:
        # Обработка ошибок
        print(f"=== ОШИБКА ===")
        print(f"Тип ошибки: {type(e).__name__}")
        print(f"Сообщение: {str(e)}")
        
        return {
            "status": "error",
            "message": f"Произошла ошибка при анализе: {str(e)}",
            "data": {
                "cardTypes": request.cardType,
                "banks": request.banks,
                "criteria": request.criteria,
                "summarizedResult": "К сожалению, не удалось выполнить анализ. Пожалуйста, попробуйте позже."
            }
        }

@app.get("/")
async def read_root():
    return {
        "message": "ИИ-Агент",
        "version": "1.0",
        "endpoints": {
            "compare": "/api/params (POST)"
        }
    }

@app.get("/health")
async def health_check():
    """Проверка работоспособности сервера"""
    return {
        "status": "healthy",
        "message": "Backend is running"
    }