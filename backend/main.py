import os
from typing import List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from src.model_analyze import save_models_results
from src.prompts import get_product_analysis_prompt

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

# Модель данных для запроса
class ComparisonRequest(BaseModel):
    cardType: List[str]
    banks: List[str]
    criteria: List[str]

# Эндпоинт для сохранения параметров
@app.post("/api/params")
async def compare_products(request: ComparisonRequest):
    """
    Принимает выбранные параметры и сохраняет результат выбора в массивы
    """
    print("=== Получены данные ===")
    print(f"Типы карт: {request.cardType}")
    print(f"Банки: {request.banks}")
    print(f"Критерии: {request.criteria}")

    # Преобразуем в массивы Python
    card_types = request.cardType
    banks = request.banks
    criteria = request.criteria

    # Здесь логика запускается функция парсера, на вход подаются
    # Вход: card_types, banks, criteria
    # Выход: json-файл, сохраняется в src/data/analysis_data.json
    analysis_data = """
    {
  "analysis_parameters": {
    "competitors": ["Сбер", "ВТБ", "Альфа-Банк", "Тинькофф"],
    "product": "Тарифы",
    "criteria": [
      "Бесплатное обслуживание",
      "Бесплатные СМС-уведомления",
      "Бесплатное снятие наличных в других банках",
      "Бесплатные переводы по реквизитам",
      "Процент на остаток",
      "Кэшбэк от партнеров"
    ]
  },
  "comparison_table": [
    {
      "criterion": "Бесплатное обслуживание",
      "scores": {
        "Сбер": true,
        "ВТБ": 1000,
        "Альфа-Банк": 500,
        "Тинькофф": true
      }
    },
    {
      "criterion": "Бесплатные СМС-уведомления",
      "scores": {
        "Сбер": true,
        "ВТБ": true,
        "Альфа-Банк": 50,
        "Тинькофф": true
      }
    },
    {
      "criterion": "Бесплатное снятие наличных в других банках",
      "scores": {
        "Сбер": 2,
        "ВТБ": 1,
        "Альфа-Банк": true,
        "Тинькофф": 5
      }
    },
    {
      "criterion": "Бесплатные переводы по реквизитам",
      "scores": {
        "Сбер": true,
        "ВТБ": true,
        "Альфа-Банк": true,
        "Тинькофф": true
      }
    },
    {
      "criterion": "Процент на остаток",
      "scores": {
        "Сбер": 11.7,
        "ВТБ": 20.0,
        "Альфа-Банк": false,
        "Тинькофф": 12
      }
    },
    {
      "criterion": "Кэшбэк от партнеров",
      "scores": {
        "Сбер": true,
        "ВТБ": true,
        "Альфа-Банк": true,
        "Тинькофф": true
      }
    }
  ],
  "conclusions": {
    "best_bank": "Тинькофф",
    "sber_advantages": [
      "Бесплатные СМС-уведомления",
      "Бесплатные переводы по реквизитам",
      "Процент на остаток",
      "Кэшбэк от партнеров"
    ],
    "sber_improvements": [
      "Бесплатное обслуживание",
      "Бесплатное снятие наличных в других банках"
    ]
  }
}
    """
    # Запуск функции model_analyze.save_models_results
    
    prompt = get_product_analysis_prompt(analysis_data)
    models_analysis_result = save_models_results(prompt)
    print(models_analysis_result)
    with open('src/data/analysis_results.txt', 'w', encoding='utf-8') as f:
        for i, model_result in enumerate(models_analysis_result, 1):
            f.write(f"=== Результат анализа {i} ===\n")
            f.write(str(model_result) + "\n")
            f.write("=" * 50 + "\n\n")

    # Пример ответа
    return {
        "status": "success",
        "message": "Данные успешно получены",
        "data": {
            "cardTypes": card_types,
            "banks": banks,
            "criteria": criteria,
            "comparisonResult": "Результат сравнения будет здесь"
        }
    }

@app.get("/")
async def read_root():
    return {"message": "Hello from FastAPI backend!"}
