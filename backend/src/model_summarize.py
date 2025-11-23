import requests
import json
import os

# Конфигурация для OpenRouter
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY") or "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"
OPENROUTER_MODEL = "deepseek/deepseek-r1-0528-qwen3-8b"


def make_openrouter_request(model, text):
    """Выполняет запрос к OpenRouter API для указанной модели и возвращает результаты."""
    try:
        print(f"=== Запрос для модели {OPENROUTER_MODEL} (OpenRouter) ===")
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            data=json.dumps({
                "model": model,
                "messages": [
                    {
                        "role": "user",
                        "content": text
                    }
                ],
                "extra_body": {"reasoning": {"enabled": True}}
            }),
            timeout=30
        )
        
        status_code = response.status_code
        if status_code != 200:
            print(f"Ошибка для {model}: {status_code}")
            print(response.text if hasattr(response, 'text') else "Нет текста ошибки")
            return {
                "model": model,
                "response": f"Ошибка: {status_code}",
                "reasoning_present": False,
                "status_code": status_code
            }
        
        data = response.json()
        assistant_message = data['choices'][0]['message']
        content = assistant_message.get('content', 'Нет содержимого')
        reasoning_present = 'reasoning_details' in assistant_message
        
        print(f"Ответ: {content}")
        print(f"Reasoning details присутствуют: {reasoning_present}")
        
        return {
            "model": model,
            "response": content,
            "reasoning_present": reasoning_present,
            "status_code": status_code
        }
            
    except requests.exceptions.Timeout:
        print(f"Таймаут для {model}")
        return {
            "model": model,
            "response": "Таймаут",
            "reasoning_present": False,
            "status_code": -1
        }
    except requests.exceptions.RequestException as e:
        print(f"Ошибка сети для {model}: {e}")
        return {
            "model": model,
            "response": f"Ошибка сети: {e}",
            "reasoning_present": False,
            "status_code": -2
        }
    except KeyError as e:
        print(f"Ошибка в структуре ответа для {model}: {e}")
        return {
            "model": model,
            "response": f"Ошибка парсинга: {e}",
            "reasoning_present": False,
            "status_code": 0
        }
    except Exception as e:
        print(f"Неожиданная ошибка для {model}: {e}")
        return {
            "model": model,
            "response": f"Неожиданная ошибка: {e}",
            "reasoning_present": False,
            "status_code": -3
        }

def save_summarized_result(models_analysis_results):
    analysis_text = ''.join(models_analysis_results)

    prompt =    """
   Роль (Role)
Ты — продуктовый аналитик. Твоя задача — проанализировать три отдельных отчета от разных AI-моделей и создать на их основе единый, целостный и структурированный итоговый отчет.

Контекст (Context)
Ты получаешь на вход три анализа одного и того же продукта. Твоя цель — не сравнивать их явно, а синтезировать всю информацию в лучший конечный результат.

Задача (Goal)
На основе совокупности данных из всех трех отчетов создать итоговый анализ, который представляет собой единую согласованную позицию.

Процесс (Action Steps)
- Анализ и синтез: Внимательно изучи все три отчета. Выяви все ключевые insights, сильные и слабые стороны, которые в них содержатся.
- Обобщение: Объедини повторяющиеся темы и аргументы. Для противоречивых оценок прими взвешенное решение на основе силы аргументации.
- Формирование отчета: Создай итоговый документ, который читается как результат работы одного эксперта, а не как сводка мнений.

Формат Вывода (Output Format)
Строго придерживайся следующей структуры. Не упоминай в отчете, что он основан на трех источниках.

ИТОГОВЫЙ АНАЛИЗ ПРОДУКТА: [Название продукта]

1. Общее описание и концепция:
[Краткое и ясное описание продукта, его основная ценность и место на рынке.]

2. Потенциал и ценность:
[Анализ потенциала продукта. Укажите его сильные стороны с точки зрения создания ценности для пользователя и бизнеса.]

3. Ключевые преимущества:
- [Преимущество 1]
- [Преимущество 2]
- [Преимущество 3]

4. Ключевые риски и ограничения:
- [Риск/ограничение 1]
- [Риск/ограничение 2]
- [Риск/ограничение 3]

5. Целевая аудитория:
[Опишите основной сегмент пользователей, для которого предназначен продукт.]

6. Рекомендации и выводы:
[Дайте итоговую оценку продукта (обязательно указать, что за продукт), основные выводы и, при необходимости, рекомендации к действию. Текст должен быть написан уверенно, как итог глубокого анализа. Избегай использования нечитаемых символов (стикеры, рисунки, разметки).]

Критерии успеха (Success Criteria)
- Итоговый отчет считается качественным, если он:
- Целостный: Воспринимается как работа одного эксперта.
- Уверенный: Избегает формулировок "одна модель считает...", а представляет обобщенную позицию.
- Структурированный: Четко следует заданному формату.
- Практичный: Содержит ясные выводы и предоставляет готовую основу для принятия решений.
    """
    text = analysis_text + prompt
    summarized_result = make_openrouter_request(OPENROUTER_MODEL, text)
    
    return summarized_result